export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { messages, imageData, mediaType } = req.body;

  const systemPrompt = `You are a nutrition expert in a fitness app called ChallengePac. The user has sent a photo of their food.

YOUR JOB:
1. First message: Describe ALL foods AND likely cooking ingredients you see (include oils, butter, sauces, dressings even if not explicitly visible but likely used). Ask ONE clarifying question about the most important unknown.
2. Second message: Ask ONE more clarifying question if truly needed, otherwise go to the estimate.
3. Final message: Give a full breakdown including COOKING INGREDIENTS like olive oil, butter, cooking spray etc.

IMPORTANT: Always consider and include:
- Cooking oils (olive oil, vegetable oil, butter used for cooking)
- Sauces, dressings, condiments
- Breading or coatings
- Toppings that may not be obvious

WHEN GIVING FINAL ESTIMATE respond with this JSON at the end:
FOOD_BREAKDOWN_JSON:
[
  {"name": "Chicken breast (grilled)", "protein": 35, "fat": 4, "carbs": 0},
  {"name": "Olive oil (cooking)", "protein": 0, "fat": 7, "carbs": 0},
  {"name": "Side salad", "protein": 2, "fat": 1, "carbs": 8}
]

Rules:
- Max 2 clarifying questions total
- List EVERY component separately including cooking fats
- Use best judgment for typical cooking amounts if not specified (e.g. 1 tbsp olive oil for pan frying)
- Give realistic evidence-based numbers for protein, fat AND carbs for every item`;

  try {
    let apiMessages = [];
    if (imageData) {
      apiMessages.push({
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: imageData } },
          { type: 'text', text: 'Please analyze this food photo including any likely cooking ingredients.' }
        ]
      });
    }
    if (messages && messages.length > 0) {
      apiMessages = [...apiMessages, ...messages];
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 800, system: systemPrompt, messages: apiMessages })
    });

    const data = await response.json();
    if (!response.ok) { res.status(500).json({ error: data.error?.message || 'API error' }); return; }
    res.status(200).json({ text: data.content[0].text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
