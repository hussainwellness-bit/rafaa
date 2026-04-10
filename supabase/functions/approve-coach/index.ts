// ── approve-coach ─────────────────────────────────────────────────────────────
// Called by super admin to approve a coach request.
// Steps:
//   1. Load coach_request by id
//   2. Insert profile row (with temp UUID so trigger can link properly)
//   3. Create auth user via admin API (trigger fires, updates profile.id)
//   4. Update profile with full coach data
//   5. Update coach_request.status = 'approved'
//   6. Send approval email + credentials email via Resend
//
// Deploy: supabase functions deploy approve-coach --no-verify-jwt
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function calcSubscriptionEnd(plan: string, start: Date): string {
  const d = new Date(start)
  if (plan === '3_months') d.setMonth(d.getMonth() + 3)
  else if (plan === '6_months') d.setMonth(d.getMonth() + 6)
  else d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().slice(0, 10)
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

  // ── 2. Insert profile with temp UUID (so trigger can find it by email) ────
  const today = new Date().toISOString().slice(0, 10)
  const subscriptionEnd = req_data.subscription_plan
    ? calcSubscriptionEnd(req_data.subscription_plan, new Date())
    : null

  const { error: profileInsertErr } = await supabaseAdmin.from('profiles').insert({
    id:                  crypto.randomUUID(),
    email:               req_data.email,
    full_name:           req_data.full_name,
    role:                'coach',
    phone:               req_data.phone ?? null,
    coach_bio:           req_data.bio ?? null,
    coach_specialty:     req_data.specialty ?? null,
    years_experience:    req_data.years_experience ?? null,
    subscription_plan:   req_data.subscription_plan ?? null,
    subscription_start:  today,
    subscription_end:    subscriptionEnd,
    subscription_status: 'pending',
    accepting_heroes:    false,
    is_profile_complete: false,
    is_active:           true,
    created_at:          new Date().toISOString(),
  })

  if (profileInsertErr) {
    console.error('[approve-coach] profile insert error:', profileInsertErr.message)
    return new Response(JSON.stringify({ error: 'Failed to create profile: ' + profileInsertErr.message }), { status: 500, headers: corsHeaders })
  }
  console.log('[approve-coach] profile row inserted for', req_data.email)

  // ── 3. Create auth user (trigger fires → updates profile.id to auth id) ───
  const tempPassword = crypto.randomUUID().replace(/-/g, '').slice(0, 16) + 'Aa1!'
  const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
    email:          req_data.email,
    password:       tempPassword,
    email_confirm:  true,
    user_metadata:  { full_name: req_data.full_name },
  })

  if (authErr || !authData.user) {
    console.error('[approve-coach] auth user creation error:', authErr?.message)
    // Clean up temp profile
    await supabaseAdmin.from('profiles').delete().eq('email', req_data.email)
    return new Response(JSON.stringify({ error: 'Failed to create auth user: ' + authErr?.message }), { status: 500, headers: corsHeaders })
  }

  const userId = authData.user.id
  console.log('[approve-coach] auth user created:', userId)

  // ── 4. Ensure profile has full coach data (trigger may have simplified) ───
  await supabaseAdmin.from('profiles').update({
    role:                'coach',
    full_name:           req_data.full_name,
    phone:               req_data.phone ?? null,
    coach_bio:           req_data.bio ?? null,
    coach_specialty:     req_data.specialty ?? null,
    years_experience:    req_data.years_experience ?? null,
    subscription_plan:   req_data.subscription_plan ?? null,
    subscription_start:  today,
    subscription_end:    subscriptionEnd,
    subscription_status: 'pending',
    accepting_heroes:    false,
    is_profile_complete: false,
    is_active:           true,
  }).eq('id', userId)

  // ── 5. Mark request as approved ───────────────────────────────────────────
  await supabaseAdmin.from('coach_requests')
    .update({ status: 'approved', updated_at: new Date().toISOString() })
    .eq('id', requestId)

  // ── 6. Send emails via Resend ──────────────────────────────────────────────
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  const RESEND_FROM = Deno.env.get('RESEND_FROM') ?? 'RafaaTech <onboarding@resend.dev>'
  const appUrl = Deno.env.get('APP_URL') ?? 'https://rafaa-jet.vercel.app'

  if (RESEND_API_KEY) {
    const price = req_data.subscription_price ?? 0
    const planName = planLabel(req_data.subscription_plan ?? '')

    // Email 1: Approval + payment instructions
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [req_data.email],
        subject: 'Welcome to RafaaTech — Set up your account',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#080808;color:#f2f2f2;padding:40px;border-radius:12px;">
            <h1 style="font-size:28px;color:#c8ff00;letter-spacing:2px;">CONGRATULATIONS! 🎉</h1>
            <p style="color:#aaa;">Hi ${req_data.full_name},</p>
            <p>Your application to join RafaaTech as a coach has been <strong style="color:#c8ff00;">approved</strong>!</p>
            <div style="margin:24px 0;padding:20px;background:#111;border-radius:8px;border:1px solid #222;">
              <p style="margin:0 0 8px;color:#888;font-size:13px;">SUBSCRIPTION DETAILS</p>
              <p style="margin:4px 0;">Plan: <strong>${planName}</strong></p>
              <p style="margin:4px 0;">Amount: <strong style="color:#c8ff00;">${price.toLocaleString()} SAR</strong></p>
              <p style="margin:4px 0;">Reference: <strong>${requestId}</strong></p>
            </div>
            <p>To activate your account, please complete payment. Use the reference above when transferring.</p>
            <p style="margin:24px 0;">Once payment is confirmed, you can sign in at:<br/>
              <a href="${appUrl}" style="color:#c8ff00;">${appUrl}</a>
            </p>
            <p style="color:#aaa;font-size:14px;">Your login credentials will be sent in a separate email.</p>
            <p style="color:#666;font-size:13px;margin-top:32px;">— The RafaaTech Team</p>
          </div>
        `,
      }),
    }).catch(e => console.warn('[approve-coach] approval email failed:', e))

    // Email 2: Login credentials
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [req_data.email],
        subject: 'Your RafaaTech login details',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#080808;color:#f2f2f2;padding:40px;border-radius:12px;">
            <h1 style="font-size:24px;color:#c8ff00;">YOUR LOGIN DETAILS</h1>
            <p style="color:#aaa;">Hi ${req_data.full_name},</p>
            <p>Here are your RafaaTech login credentials:</p>
            <div style="margin:20px 0;padding:20px;background:#111;border-radius:8px;border:1px solid #222;font-family:monospace;">
              <p style="margin:4px 0;">Email: <strong style="color:#c8ff00;">${req_data.email}</strong></p>
              <p style="margin:4px 0;">Password: <strong style="color:#c8ff00;">${tempPassword}</strong></p>
            </div>
            <p>Sign in at: <a href="${appUrl}" style="color:#c8ff00;">${appUrl}</a></p>
            <p style="color:#888;font-size:13px;">Please change your password after your first login.</p>
            <p style="color:#666;font-size:13px;margin-top:32px;">— The RafaaTech Team</p>
          </div>
        `,
      }),
    }).catch(e => console.warn('[approve-coach] credentials email failed:', e))

    console.log('[approve-coach] emails sent to', req_data.email)
  } else {
    console.warn('[approve-coach] RESEND_API_KEY not set — emails skipped')
  }

  return new Response(
    JSON.stringify({ success: true, userId }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
