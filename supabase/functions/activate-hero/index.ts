// ── activate-hero ─────────────────────────────────────────────────────────────
// Called when a coach clicks "Activate Plan & Send Login" or "Resend Login Email".
// Steps:
//   1. Look up hero profile (service role)
//   2. Ensure hero has a Supabase Auth account (create if missing)
//   3. Sync profile.id to auth user UUID if newly created
//   4. Set hero is_active = true
//   5. Generate password-setup link and send via Resend
//   6. Return { success, emailSent, emailError? }
//
// Deploy: supabase functions deploy activate-hero --no-verify-jwt
// Env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, RESEND_FROM, APP_URL
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  // ── Parse body ─────────────────────────────────────────────────────────────
  let body: { heroId?: string; coachId?: string }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'invalid json' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { heroId } = body
  if (!heroId) {
    return new Response(JSON.stringify({ error: 'heroId is required' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // ── Early env diagnostics ─────────────────────────────────────────────────
  console.log('[activate-hero] starting for heroId:', heroId)
  console.log('[activate-hero] RESEND_API_KEY exists:', !!Deno.env.get('RESEND_API_KEY'))
  console.log('[activate-hero] RESEND_FROM:', Deno.env.get('RESEND_FROM') ?? '(not set — will use default)')
  console.log('[activate-hero] APP_URL:', Deno.env.get('APP_URL') ?? '(not set — will use default)')

  // ── Admin client (service role — bypasses RLS) ─────────────────────────────
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  const RESEND_FROM    = Deno.env.get('RESEND_FROM') ?? 'RafaaTech <onboarding@resend.dev>'
  const appUrl         = Deno.env.get('APP_URL') ?? 'https://rafaa-jet.vercel.app'

  // ── 1. Look up hero profile ────────────────────────────────────────────────
  const { data: heroProfile, error: fetchErr } = await supabaseAdmin
    .from('profiles')
    .select('id, email, full_name, is_active')
    .eq('id', heroId)
    .single()

  if (fetchErr || !heroProfile) {
    console.error('[activate-hero] Hero not found:', fetchErr?.message)
    return new Response(JSON.stringify({ error: 'Hero not found' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const heroEmail = heroProfile.email as string
  const heroName  = (heroProfile.full_name as string) ?? 'Athlete'

  if (!heroEmail) {
    return new Response(JSON.stringify({ error: 'Hero has no email address' }), {
      status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  console.log('[activate-hero] hero email:', heroEmail, '| profile id:', heroId, '| already active:', heroProfile.is_active)

  // ── 2. Ensure auth user exists; sync profile.id if newly created ──────────
  // Hero profiles are created by the coach with crypto.randomUUID() — no auth
  // account exists yet. generateLink({ type: 'recovery' }) would fail without one.
  let activeHeroId = heroId  // may change if we create a new auth user

  const { data: existingAuthUser } = await supabaseAdmin.auth.admin.getUserByEmail(heroEmail)

  if (!existingAuthUser?.user) {
    console.log('[activate-hero] No auth user found for', heroEmail, '— creating one')

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email:          heroEmail,
      email_confirm:  true,   // skip email confirmation — we send the activation link ourselves
      user_metadata:  { full_name: heroName },
    })

    if (createErr || !created?.user) {
      console.error('[activate-hero] createUser failed:', createErr?.message)
      return new Response(JSON.stringify({ error: 'Failed to create auth user: ' + createErr?.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const newAuthId = created.user.id
    console.log('[activate-hero] Auth user created:', newAuthId)

    // Sync profile.id → newAuthId so auth.uid() matches profile.id (required for RLS)
    const { error: syncErr } = await supabaseAdmin
      .from('profiles')
      .update({ id: newAuthId })
      .eq('id', heroId)

    if (syncErr) {
      console.error('[activate-hero] Failed to sync profile.id:', syncErr.message)
      // Non-fatal: the email will still work; RLS may have issues until fixed manually
    } else {
      console.log('[activate-hero] profile.id synced to auth UUID ✓')
      // Also update hero_requests.linked_hero_id reference
      await supabaseAdmin
        .from('hero_requests')
        .update({ linked_hero_id: newAuthId })
        .eq('linked_hero_id', heroId)
    }

    activeHeroId = newAuthId
  } else {
    console.log('[activate-hero] Existing auth user found:', existingAuthUser.user.id)
    activeHeroId = existingAuthUser.user.id
  }

  // ── 3. Set is_active = true ────────────────────────────────────────────────
  const { error: activateErr } = await supabaseAdmin
    .from('profiles')
    .update({ is_active: true })
    .eq('id', activeHeroId)

  if (activateErr) {
    console.error('[activate-hero] Failed to activate hero:', activateErr.message)
    return new Response(JSON.stringify({ error: 'Failed to activate hero: ' + activateErr.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  console.log('[activate-hero] Hero marked active ✓')

  if (!RESEND_API_KEY) {
    console.error('[activate-hero] RESEND_API_KEY not set')
    return new Response(
      JSON.stringify({ success: true, emailSent: false, emailError: 'RESEND_API_KEY not configured' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  // ── 4. Generate password-setup link ───────────────────────────────────────
  let setupLink = `${appUrl}/auth/callback`

  const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type:    'recovery',
    email:   heroEmail,
    options: { redirectTo: `${appUrl}/auth/callback` },
  })

  if (linkErr) {
    console.error('[activate-hero] generateLink failed:', linkErr.message)
    // setupLink falls back to /auth/callback without a token — hero can use forgot-password
  } else {
    setupLink = linkData.properties?.action_link ?? setupLink
    console.log('[activate-hero] password-setup link generated ✓')
  }

  // ── 5. Send email via Resend ───────────────────────────────────────────────
  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from:    RESEND_FROM,
      to:      [heroEmail],
      subject: 'Your RafaaTech plan is ready — Set up your account',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#080808;color:#f2f2f2;padding:40px;border-radius:12px;">
          <h1 style="font-size:32px;color:#c8ff00;margin-bottom:8px;letter-spacing:2px;">YOUR PLAN IS READY 💪</h1>
          <p style="color:#aaa;margin-bottom:24px;font-size:16px;">Hi ${heroName},</p>
          <p style="font-size:15px;line-height:1.6;">Your coach has activated your personalized training plan on RafaaTech.</p>
          <p style="font-size:15px;line-height:1.6;margin-top:12px;">Click below to set your password and access your training dashboard:</p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${setupLink}"
              style="display:inline-block;background:#c8ff00;color:#080808;font-weight:bold;font-size:14px;letter-spacing:2px;text-transform:uppercase;padding:14px 32px;border-radius:100px;text-decoration:none;">
              SET UP MY ACCOUNT →
            </a>
          </div>
          <p style="color:#666;font-size:13px;text-align:center;margin-bottom:32px;">
            This link expires in 24 hours. If it expires, use "Forgot password?" on the sign-in page.
          </p>
          <div style="padding:20px;background:#111;border-radius:8px;border:1px solid #222;">
            <p style="margin:0;color:#888;font-size:13px;line-height:1.6;">
              Once inside, your personalized workout plan will be waiting. Track your sessions, nutrition, and progress — all in one place.
            </p>
          </div>
          <p style="color:#aaa;margin-top:32px;font-size:14px;">
            Let's go! 💪<br/>— The RafaaTech Team
          </p>
        </div>
      `,
    }),
  })

  const resendData = await resendResponse.json()
  console.log('[activate-hero] Resend response:', JSON.stringify(resendData))

  if (!resendResponse.ok) {
    console.error('[activate-hero] Email failed:', resendData)
    return new Response(
      JSON.stringify({
        success:    true,
        emailSent:  false,
        emailError: resendData.message ?? resendData.error ?? 'Email send failed',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  console.log('[activate-hero] Email sent to', heroEmail, '✓')
  return new Response(
    JSON.stringify({ success: true, emailSent: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
