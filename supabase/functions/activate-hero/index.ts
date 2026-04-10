// ── activate-hero ─────────────────────────────────────────────────────────────
// Called when a coach clicks "Activate Plan & Send Login" or "Resend Login Email".
// Steps:
//   1. Verify calling user is authenticated (JWT from gateway)
//   2. Look up hero email + name from profiles (using service role)
//   3. Set hero is_active = true if not already
//   4. Send login email via Resend
//   5. Return { success, emailSent, emailError? }
//
// Deploy: supabase functions deploy activate-hero
// Env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, APP_URL
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
  const heroName = (heroProfile.full_name as string) ?? 'Athlete'

  if (!heroEmail) {
    console.error('[activate-hero] Hero has no email — id:', heroId)
    return new Response(JSON.stringify({ error: 'Hero has no email address' }), {
      status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  console.log('[activate-hero] Processing hero:', heroId, heroEmail, '| already active:', heroProfile.is_active)

  // ── 2. Set is_active = true (only if not already active) ──────────────────
  if (!heroProfile.is_active) {
    const { error: updateErr } = await supabaseAdmin
      .from('profiles')
      .update({ is_active: true })
      .eq('id', heroId)

    if (updateErr) {
      console.error('[activate-hero] Failed to activate hero:', updateErr.message)
      return new Response(JSON.stringify({ error: 'Failed to activate hero: ' + updateErr.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    console.log('[activate-hero] Hero marked active ✓')
  } else {
    console.log('[activate-hero] Hero was already active — skipping update, just resending email')
  }

  // ── 3. Generate secure password-setup link ────────────────────────────────
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  const RESEND_FROM = Deno.env.get('RESEND_FROM') ?? 'RafaaTech <onboarding@resend.dev>'
  const appUrl = Deno.env.get('APP_URL') ?? 'https://rafaa-jet.vercel.app'

  if (!RESEND_API_KEY) {
    console.error('[activate-hero] RESEND_API_KEY not set')
    return new Response(
      JSON.stringify({ success: true, emailSent: false, emailError: 'RESEND_API_KEY not configured' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  // Use generateLink so hero sets their own password — no plain text password in email
  let setupLink = appUrl
  const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type:  'recovery',
    email: heroEmail,
    options: { redirectTo: `${appUrl}/auth/callback` },
  })
  if (linkErr) {
    console.warn('[activate-hero] generateLink failed:', linkErr.message, '— falling back to app URL')
  } else {
    setupLink = linkData.properties?.action_link ?? appUrl
    console.log('[activate-hero] setup link generated ✓')
  }

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: [heroEmail],
      subject: 'Your RafaaTech plan is ready — Set up your account',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#080808;color:#f2f2f2;padding:40px;border-radius:12px;">
          <h1 style="font-size:32px;color:#c8ff00;margin-bottom:8px;letter-spacing:2px;">YOUR PLAN IS READY 💪</h1>
          <p style="color:#aaa;margin-bottom:24px;font-size:16px;">Hi ${heroName},</p>
          <p style="font-size:15px;line-height:1.6;">Your coach has activated your personalized training plan on RafaaTech.</p>
          <p style="font-size:15px;line-height:1.6;margin-top:12px;">Click below to set your password and access your dashboard:</p>
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
        success: true,
        emailSent: false,
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
