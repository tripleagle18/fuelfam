export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { code, imageData, mediaType } = req.body;

  // If image provided, first use AI to read the barcode number from the photo
  if (imageData && !code) {
    try {
      const aiResp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 200,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: imageData } },
              { type: 'text', text: 'Read the barcode number in this image. Only respond with the digits of the barcode number, nothing else. If you cannot read a barcode, respond with "NONE".' }
            ]
          }]
        })
      });
      const aiData = await aiResp.json();
      const barcodeText = aiData.content?.[0]?.text?.trim() || 'NONE';
      const digits = barcodeText.replace(/\D/g, '');
      if (!digits || digits.length < 6) {
        return res.status(200).json({ error: 'Could not read barcode from photo. Try manual entry.' });
      }
      // Now look up the barcode
      return await lookupCode(digits, res);
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // Direct code lookup
  if (code) {
    return await lookupCode(code, res);
  }

  res.status(400).json({ error: 'No barcode or image provided' });
}

async function lookupCode(code, res) {
  try {
    const resp = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`, {
      headers: { 'User-Agent': 'FuelFam/1.0' }
    });
    const data = await resp.json();
    if (data.status === 1 && data.product) {
      const p = data.product;
      const name = p.product_name || p.brands || 'Unknown product';
      const n = p.nutriments || {};
      const protein = Math.round(n['proteins_serving'] || n['proteins_100g'] || 0);
      const serving = p.serving_size || 'per 100g';
      return res.status(200).json({ found: true, name, protein, serving, code });
    } else {
      return res.status(200).json({ found: false, code, error: 'Product not found in database. Try manual food entry.' });
    }
  } catch(e) {
    return res.status(500).json({ error: 'Database lookup failed: ' + e.message });
  }
}
