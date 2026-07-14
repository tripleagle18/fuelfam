export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { messages, imageData, mediaType } = req.body;

  const systemPrompt = `You are a nutrition expert in a fitness app called ChallengePac. The user has sent a photo of their food.

YOUR JOB:
1. First message: Describe what you see, then ask ONE clarifying question about the most important unknown (usually portion size).
2. Second message: Ask ONE more clarifying question if truly needed, otherwise skip to the estimate.
3. Final message: Give a breakdown of each food item with protein, fat, and carbs.

WHEN GIVING FINAL ESTIMATE you MUST respond with this JSON block at the end:
FOOD_BREAKDOWN_JSON:
[
  {"name": "Food item name", "protein": 25, "fat": 10, "carbs": 15},
  {"name": "Another item", "protein": 10, "fat": 5, "carbs": 20}
]

Rules:
- Max 2 clarifying questions total
- Keep messages short and friendly
- Always give realistic estimates for protein, fat AND carbs for every item
- Protein numbers, fat numbers, and carb numbers should all be evidence-based`;

  try {
    let apiMessages = [];
    if (imageData) {
      apiMessages.push({
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: imageData } },
          { type: 'text', text: 'Please analyze this food photo.' }
        ]
      });
    }
    if (messages && messages.length > 0) {
      apiMessages = [...apiMessages, ...messages];
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 600, system: systemPrompt, messages: apiMessages })
    });

    const data = await response.json();
    if (!response.ok) { res.status(500).json({ error: data.error?.message || 'API error' }); return; }
    res.status(200).json({ text: data.content[0].text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
