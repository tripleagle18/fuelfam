export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { messages } = req.body;
  if (!messages) { res.status(400).json({ error: 'No messages provided' }); return; }

  const systemPrompt = `You are a friendly nutrition assistant inside a fitness app called ChallengePac. Your ONLY job is to figure out the macros in something the user ate.

RULES:
- Ask a maximum of 2-3 short, specific follow-up questions to clarify portions and ingredients
- Once you have enough info, give the macro estimate
- When ready to give the final estimate, you MUST end your response with this exact format on its own line:
  MACRO_ESTIMATE: [protein]g protein, [fat]g fat, [carbs]g carbs - [food name]
- Keep all responses short and friendly
- Focus questions on: portion size, protein-containing ingredients, cooking method if relevant
- Give realistic, evidence-based numbers for all three macros`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 300, system: systemPrompt, messages })
    });
    const data = await response.json();
    if (!response.ok) { res.status(500).json({ error: data.error?.message || 'API error' }); return; }
    res.status(200).json({ text: data.content[0].text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
