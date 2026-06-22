export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { messages } = req.body;
  if (!messages) { res.status(400).json({ error: 'No messages provided' }); return; }

  const systemPrompt = `You are a friendly nutrition assistant inside a fitness app called FuelFam. Your ONLY job is to figure out how much protein was in something the user ate.

RULES:
- Ask a maximum of 2-3 short, specific follow-up questions to clarify portions and ingredients that affect protein content
- Questions should be short and conversational — one question at a time
- Once you have enough info (after 2-3 questions max), give the protein estimate
- When you're ready to give the final estimate, you MUST end your response with this exact format on its own line:
  PROTEIN_ESTIMATE: [number]g - [food name]
- Keep all responses short and friendly
- Don't ask about things that don't affect protein (like taste, enjoyment, etc.)
- Focus questions on: portion size, protein-containing ingredients (meat, cheese, eggs, beans), cooking method if relevant`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 300,
        system: systemPrompt,
        messages: messages
      })
    });

    const data = await response.json();
    if (!response.ok) { res.status(500).json({ error: data.error?.message || 'API error' }); return; }
    res.status(200).json({ text: data.content[0].text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
