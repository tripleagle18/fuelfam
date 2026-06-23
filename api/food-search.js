export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { query } = req.body;
  if (!query || query.trim().length < 2) { res.status(400).json({ error: 'Search query too short' }); return; }

  try {
    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(query)}&dataType=Branded,Survey (FNDDS),Foundation&pageSize=20&api_key=DEMO_KEY`;
    const resp = await fetch(url);
    const data = await resp.json();

    if (!data.foods || data.foods.length === 0) {
      return res.status(200).json({ results: [] });
    }

    const results = data.foods
      .map(food => {
        const proteinNutrient = food.foodNutrients?.find(n =>
          n.nutrientName?.toLowerCase().includes('protein') ||
          n.nutrientId === 1003
        );
        const protein = proteinNutrient ? Math.round(proteinNutrient.value || 0) : null;
        return {
          id: food.fdcId,
          name: food.description,
          brand: food.brandOwner || food.brandName || null,
          serving: food.servingSize ? `${food.servingSize}${food.servingSizeUnit || 'g'}` : '100g',
          protein
        };
      })
      .filter(f => f.protein !== null && f.protein >= 0)
      .slice(0, 15);

    res.status(200).json({ results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
