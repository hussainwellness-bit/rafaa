// ── reject-coach ──────────────────────────────────────────────────────────────
// Called by super admin to reject a coach request.
// Updates status, sends rejection email.
// Deploy: supabase functions deploy reject-coach --no-verify-jwt
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  let body: { requestId?: string; reason?: string }
  try { body = await req.json() }
  catch { return new Response(JSON.stringify({ error: 'invalid json' }), { status: 400, headers: corsHeaders }) }

  const { requestId, reason } = body
  if (!requestId) {
    return new Response(JSON.stringify({ error: 'requestId is required' }), { status: 400, headers: corsHeaders })
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  // Load request
  const { data: req_data, error: reqErr } = await supabaseAdmin
    .from('coach_requests')
    .select('email, full_name')
    .eq('id', requestId)
    .single()
  if (reqErr || !req_data) {
    return new Response(JSON.stringify({ error: 'Request not found' }), { status: 404, headers: corsHeaders })
  }

  // Update status
  await supabaseAdmin.from('coach_requests').update({
    status: 'rejected',
    rejection_reason: reason ?? null,
    updated_at: new Date().toISOString(),
  }).eq('id', requestId)

  // Send rejection email
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  const RESEND_FROM = Deno.env.get('RESEND_FROM') ?? 'RafaaTech <onboarding@resend.dev>'

  if (RESEND_API_KEY) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [req_data.email],
        subject: 'RafaaTech Application Update',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#080808;color:#f2f2f2;padding:40px;border-radius:12px;">
            <h1 style="font-size:24px;color:#f2f2f2;">Application Update</h1>
            <p style="color:#aaa;">Hi ${req_data.full_name},</p>
            <p>Thank you for applying to join RafaaTech as a coach.</p>
            <p>Unfortunately, we are unable to approve your application at this time.</p>
            ${reason ? `<div style="margin:20px 0;padding:16px;background:#111;border-radius:8px;border-left:3px solid #ff3d3d;"><p style="margin:0;color:#aaa;font-size:14px;">${reason}</p></div>` : ''}
            <p style="color:#888;font-size:14px;margin-top:24px;">You are welcome to apply again in the future.</p>
            <p style="color:#666;font-size:13px;margin-top:32px;">— The RafaaTech Team</p>
          </div>
        `,
      }),
    }).catch(e => console.warn('[reject-coach] email failed:', e))
  }

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
