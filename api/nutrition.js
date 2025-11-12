export default async function handler(req, res) {
  const { query } = req.query;

  try {
    const response = await fetch(`https://api.calorieninjas.com/v1/nutrition?query=${encodeURIComponent(query)}`, {
      headers: { 'X-Api-Key': process.env.CALORIE_NINJAS_KEY },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: "API request failed" });
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Server error" });
  }
}
