export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { messages, userData } = req.body;

  const systemPrompt = `You are an expert personal nutrition and fitness coach inside an app called ChallengePac. You are friendly, motivating, and give specific actionable advice.

Here is the user's current data:
- Name: ${userData.name}
- Goal: ${userData.goal === 'lose' ? 'Lose weight' : userData.goal === 'gain' ? 'Build muscle' : 'Maintain weight'}
- Weight: ${userData.weight} lbs
- Daily calorie target: ${userData.calories} cal
- Daily protein goal: ${userData.protein}g
- Daily fat goal: ${userData.fat}g  
- Daily carbs goal: ${userData.carbs}g
- Daily water goal: ${userData.water} oz
- Activity level: ${userData.activity}
- Current streak: ${userData.streak} days

TODAY's food and nutrition log:
${userData.todaySummary}

This week's average logged data:
${userData.weekSummary}

Contest performance:
${userData.contestSummary}

COACHING GUIDELINES:
- Reference their actual numbers when giving advice
- Be encouraging but honest
- Keep responses concise and mobile-friendly (2-4 short paragraphs max)
- Give specific actionable tips based on their data
- If they're doing well, celebrate it
- If they're struggling, be supportive and give practical solutions
- You can discuss nutrition, exercise, habits, sleep, stress - anything related to their health goals`;

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
        max_tokens: 600,
        system: systemPrompt,
        messages: messages
      })
    });

    const data = await response.json();
    if (!response.ok) { res.status(500).json({ error: data.error?.message || 'API error' }); return; }
    res.status(200).json({ text: data.content[0].text });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
}
