export default async function handler(req, res) {
  const { query } = req.query;

  if (!query) {
    return res.status(400).json({ error: "Missing food query" });
  }

  try {
    const response = await fetch(`https://api.calorieninjas.com/v1/nutrition?query=${encodeURIComponent(query)}`, {
      headers: { "X-Api-Key": process.env.CALORIE_NINJAS_API_KEY }
    });

    if (!response.ok) {
      throw new Error("Failed to fetch from CalorieNinjas");
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to fetch nutrition data" });
  }
}