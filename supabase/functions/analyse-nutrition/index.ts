import Anthropic from 'npm:@anthropic-ai/sdk'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const { meal } = await req.json()
  if (!meal) return new Response(JSON.stringify({ error: 'meal required' }), { status: 400, headers: corsHeaders })

  const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! })

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: `You are a nutrition expert. When given a meal description, return ONLY a JSON object with this exact structure, no other text:
{
  "total": { "calories": number, "protein": number, "carbs": number, "fats": number, "fiber": number },
  "breakdown": [
    { "item": string, "amount": string, "calories": number, "protein": number, "carbs": number, "fats": number, "fiber": number }
  ]
}`,
    messages: [{ role: 'user', content: meal }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''

  let result
  try {
    result = JSON.parse(text)
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to parse AI response' }), { status: 500, headers: corsHeaders })
  }

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
