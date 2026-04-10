// ── approve-coach ─────────────────────────────────────────────────────────────
// Called by super admin to approve a coach application.
// Steps:
//   1. Load coach_request
//   2. Insert profile row (temp UUID so trigger can link on auth create)
//   3. Create auth user via admin API
//   4. Update profile with full coach data
//   5. Generate secure password-setup link via generateLink('recovery')
//   6. Send single welcome email with setup link (NO plain text password)
//   7. Mark request as approved
//
// Deploy: supabase functions deploy approve-coach --no-verify-jwt
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function planLabel(plan: string): string {
  if (plan === '3_months') return '3 Months'
  if (plan === '6_months') return '6 Months'
  if (plan === '1_year') return '1 Year'
  return plan
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  let body: { requestId?: string }
  try { body = await req.json() }
  catch { return new Response(JSON.stringify({ error: 'invalid json' }), { status: 400, headers: corsHeaders }) }

  const { requestId } = body
  if (!requestId) {
    return new Response(JSON.stringify({ error: 'requestId is required' }), { status: 400, headers: corsHeaders })
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  // ── 1. Load request ────────────────────────────────────────────────────────
  const { data: req_data, error: reqErr } = await supabaseAdmin
    .from('coach_requests')
    .select('*')
    .eq('id', requestId)
    .single()

  if (reqErr || !req_data) {
    return new Response(JSON.stringify({ error: 'Request not found' }), { status: 404, headers: corsHeaders })
  }
  if (req_data.status !== 'pending') {
    return new Response(JSON.stringify({ error: 'Request is not pending' }), { status: 400, headers: corsHeaders })
  }

  // ── 2. Insert profile with temp UUID ──────────────────────────────────────
  // subscription_start/end left null — set when admin confirms payment
  const profileData = {
    id:                  crypto.randomUUID(),
    email:               req_data.email,
    full_name:           req_data.full_name,
    role:                'coach',
    phone:               req_data.phone ?? null,
    coach_bio:           req_data.bio ?? null,
    coach_specialty:     req_data.specialty ?? null,
    years_experience:    req_data.years_experience ?? null,
    subscription_plan:   req_data.subscription_plan ?? null,
    subscription_status: 'pending',
    accepting_heroes:    false,
    is_profile_complete: false,
    is_active:           true,
    created_at:          new Date().toISOString(),
  }
  console.log('[ApproveCoach] inserting profile:', JSON.stringify(profileData))
  const { error: profileInsertErr } = await supabaseAdmin.from('profiles').insert(profileData)

  if (profileInsertErr) {
    console.error('[approve-coach] profile insert error:', profileInsertErr.message)
    return new Response(JSON.stringify({ error: 'Failed to create profile: ' + profileInsertErr.message }), { status: 500, headers: corsHeaders })
  }
  console.log('[approve-coach] profile row inserted for', req_data.email)

  // ── 3. Create auth user (trigger fires → updates profile.id to auth id) ───
  // Use a random internal password — never sent to user
  const internalPassword = crypto.randomUUID() + crypto.randomUUID()
  const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
    email:         req_data.email,
    password:      internalPassword,
    email_confirm: true,
    user_metadata: { full_name: req_data.full_name },
  })

  if (authErr || !authData.user) {
    console.error('[approve-coach] auth user creation error:', authErr?.message)
    await supabaseAdmin.from('profiles').delete().eq('email', req_data.email)
    return new Response(JSON.stringify({ error: 'Failed to create auth user: ' + authErr?.message }), { status: 500, headers: corsHeaders })
  }

  const userId = authData.user.id
  console.log('[approve-coach] auth user created:', userId)

  // ── 4. Update profile with full coach data ────────────────────────────────
  await supabaseAdmin.from('profiles').update({
    role:                'coach',
    full_name:           req_data.full_name,
    phone:               req_data.phone ?? null,
    coach_bio:           req_data.bio ?? null,
    coach_specialty:     req_data.specialty ?? null,
    years_experience:    req_data.years_experience ?? null,
    subscription_plan:   req_data.subscription_plan ?? null,
    subscription_status: 'pending',
    accepting_heroes:    false,
    is_profile_complete: false,
    is_active:           true,
  }).eq('id', userId)

  // ── 5. Generate secure password-setup link ────────────────────────────────
  const appUrl = Deno.env.get('APP_URL') ?? 'https://rafaa-jet.vercel.app'
  let setupLink = appUrl

  const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type:  'recovery',
    email: req_data.email,
  })

  if (linkErr) {
    console.warn('[approve-coach] generateLink failed:', linkErr.message, '— using app URL as fallback')
  } else {
    setupLink = linkData.properties?.action_link ?? appUrl
    console.log('[approve-coach] setup link generated ✓')
  }

  // ── 6. Mark request as approved ───────────────────────────────────────────
  await supabaseAdmin.from('coach_requests')
    .update({ status: 'approved', updated_at: new Date().toISOString() })
    .eq('id', requestId)

  // ── 7. Send single welcome email with setup link ──────────────────────────
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  const RESEND_FROM = Deno.env.get('RESEND_FROM') ?? 'RafaaTech <onboarding@resend.dev>'

  if (RESEND_API_KEY) {
    const price = req_data.subscription_price ?? 0
    const planName = planLabel(req_data.subscription_plan ?? '')

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [req_data.email],
        subject: 'Welcome to RafaaTech — Set up your account',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#080808;color:#f2f2f2;padding:40px;border-radius:12px;">
            <h1 style="font-size:28px;color:#c8ff00;letter-spacing:2px;margin-bottom:8px;">YOUR APPLICATION IS APPROVED! 🎉</h1>
            <p style="color:#aaa;margin-bottom:24px;">Hi ${req_data.full_name},</p>

            <p style="font-size:15px;line-height:1.6;">
              Congratulations! Your application to join RafaaTech as a coach has been <strong style="color:#c8ff00;">approved</strong>.
            </p>

            <p style="font-size:15px;line-height:1.6;margin-top:16px;">
              Click the button below to set your password and access your dashboard:
            </p>

            <div style="text-align:center;margin:32px 0;">
              <a href="${setupLink}"
                style="display:inline-block;background:#c8ff00;color:#080808;font-weight:bold;font-size:14px;letter-spacing:2px;text-transform:uppercase;padding:14px 32px;border-radius:100px;text-decoration:none;">
                SET UP MY ACCOUNT →
              </a>
            </div>

            <p style="color:#666;font-size:13px;text-align:center;margin-bottom:32px;">
              This link expires in 24 hours. If it expires, use the "Forgot password?" option on the sign-in page.
            </p>

            <div style="padding:20px;background:#111;border-radius:8px;border:1px solid #222;margin-bottom:24px;">
              <p style="margin:0 0 12px;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:2px;">Subscription Details</p>
              <p style="margin:4px 0;font-size:14px;">Plan: <strong>${planName}</strong></p>
              <p style="margin:4px 0;font-size:14px;">Amount: <strong style="color:#c8ff00;">${price.toLocaleString()} SAR</strong></p>
              <p style="margin:4px 0;font-size:14px;">Reference: <strong>${requestId}</strong></p>
            </div>

            <p style="font-size:15px;line-height:1.6;">Once you've set up your account, here's what to do next:</p>
            <ol style="color:#aaa;font-size:14px;line-height:2;padding-left:20px;">
              <li>Complete your coach profile</li>
              <li>Set up your plan pricing</li>
              <li>Wait for payment confirmation from our team</li>
              <li>Start accepting heroes!</li>
            </ol>

            <p style="color:#666;font-size:13px;margin-top:32px;">— The RafaaTech Team</p>
          </div>
        `,
      }),
    }).catch(e => console.warn('[approve-coach] welcome email failed:', e))

    console.log('[approve-coach] welcome email sent to', req_data.email)
  } else {
    console.warn('[approve-coach] RESEND_API_KEY not set — email skipped')
  }

  return new Response(
    JSON.stringify({ success: true, userId }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
