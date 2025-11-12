async function getNutrition() {
  const food = document.getElementById("foodInput").value.trim();
  const resultDiv = document.getElementById("result");

  if (!food) {
    resultDiv.innerHTML = "<p>Please enter a food name.</p>";
    return;
  }

  resultDiv.innerHTML = "<p>Loading...</p>";

  try {
    const response = await fetch(`/api/fetchNutrition?query=${encodeURIComponent(food)}`);
    const data = await response.json();

    if (data.items && data.items.length > 0) {
      const item = data.items[0];
      resultDiv.innerHTML = `
        <div class="nutrition-facts">
          <h2>${item.name}</h2>
          <table>
            <tr><td>Calories</td><td>${item.calories}</td></tr>
            <tr><td>Protein</td><td>${item.protein_g} g</td></tr>
            <tr><td>Carbohydrates</td><td>${item.carbohydrates_total_g} g</td></tr>
            <tr><td>Fat</td><td>${item.fat_total_g} g</td></tr>
            <tr><td>Sugar</td><td>${item.sugar_g} g</td></tr>
            <tr><td>Fiber</td><td>${item.fiber_g} g</td></tr>
            <tr><td>Sodium</td><td>${item.sodium_mg} mg</td></tr>
            <tr><td>Cholesterol</td><td>${item.cholesterol_mg} mg</td></tr>
          </table>
        </div>
      `;
    } else {
      resultDiv.innerHTML = "<p>No results found. Try another food.</p>";
    }
  } catch (err) {
    resultDiv.innerHTML = "<p>Error fetching data.</p>";
  }
}
