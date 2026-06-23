export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { imageData, mediaType, mode } = req.body;
  if (!imageData) { res.status(400).json({ error: 'No image data provided' }); return; }

  let prompt;
  if (mode === 'barcode') {
    prompt = `Look at this image carefully. It may show a barcode, a nutrition label, or a packaged food product.

If you can see a barcode number, respond with:
BARCODE: [the number]
PRODUCT: [product name if visible]
PROTEIN_GRAMS: 0
SERVING_SIZE: unknown

If you can see a nutrition facts label (but no readable barcode), respond with:
BARCODE: none
PRODUCT: [product name]
SERVING_SIZE: [serving size]
PROTEIN_GRAMS: [protein grams as a number]
NOTE: [one sentence]

Focus on accuracy - read the exact numbers from the label.`;
  } else {
    prompt = `You are a nutrition expert. Analyze this food image. Respond in this EXACT format:
FOODS: [foods you see]
PROTEIN_GRAMS: [number only]
NOTE: [one sentence on accuracy]`;
  }

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
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: imageData } },
            { type: 'text', text: prompt }
          ]
        }]
      })
    });

    const data = await response.json();
    if (!response.ok) { res.status(500).json({ error: data.error?.message || 'API error' }); return; }
    res.status(200).json({ text: data.content[0].text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
