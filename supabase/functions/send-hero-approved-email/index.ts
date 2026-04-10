// ── send-hero-approved-email ──────────────────────────────────────────────────
// Called when a coach approves a hero request.
// Sends a notification email letting the hero know their request was approved
// and that their coach is building their plan.
// Deploy: supabase functions deploy send-hero-approved-email
// Env vars: RESEND_API_KEY, APP_URL
// ─────────────────────────────────────────────────────────────────────────────

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  // Accept both camelCase (heroEmail) and snake_case (hero_email) for flexibility
  let body: {
    hero_name?: string; heroName?: string
    hero_email?: string; heroEmail?: string
    coach_name?: string; coachName?: string
    plan_type?: string
  }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'invalid json' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const heroName  = body.heroName  ?? body.hero_name
  const heroEmail = body.heroEmail ?? body.hero_email
  const coachName = body.coachName ?? body.coach_name ?? 'Your Coach'

  if (!heroEmail || !heroName) {
    return new Response(JSON.stringify({ error: 'heroEmail and heroName are required' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  const RESEND_FROM = Deno.env.get('RESEND_FROM') ?? 'RafaaTech <onboarding@resend.dev>'
  const appUrl = Deno.env.get('APP_URL') ?? 'https://hussain-lifts.vercel.app'

  if (!RESEND_API_KEY) {
    console.error('[send-hero-approved-email] RESEND_API_KEY not set')
    return new Response(JSON.stringify({ error: 'Email service not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: [heroEmail],
      subject: 'Your application has been approved — RafaaTech',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#080808;color:#f2f2f2;padding:40px;border-radius:12px;">
          <h1 style="font-size:28px;color:#c8ff00;margin-bottom:8px;letter-spacing:2px;">YOU'RE APPROVED! 🎉</h1>
          <p style="color:#aaa;margin-bottom:24px;font-size:16px;">Hi ${heroName},</p>
          <p style="font-size:15px;line-height:1.6;">
            Great news! <strong style="color:#f2f2f2;">${coachName}</strong> has reviewed your application and approved you for a training plan on RafaaTech.
          </p>
          <div style="margin:28px 0;padding:20px;background:#111;border-radius:8px;border:1px solid #222;">
            <p style="margin:0;color:#888;font-size:13px;line-height:1.6;">
              Your coach is currently building your personalized plan. Once your plan is ready and payment is confirmed, you will receive another email with instructions to set up your account and get started.
            </p>
          </div>
          <p style="font-size:15px;line-height:1.6;">
            In the meantime, you can check out the app at:<br/>
            <a href="${appUrl}" style="color:#c8ff00;">${appUrl}</a>
          </p>
          <p style="color:#aaa;margin-top:32px;font-size:14px;">
            Stay tuned — your journey is about to begin. 💪<br/>— The RafaaTech Team
          </p>
        </div>
      `,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[send-hero-approved-email] Resend error:', err)
    return new Response(JSON.stringify({ error: err }), {
      status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  console.log('[send-hero-approved-email] sent to', heroEmail)
  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
