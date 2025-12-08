// --- GLOBAL CONFIG ---
const WEBSITE_URL = "https://nutrifind.fit/";
const WEBSITE_TITLE = "NutriFind Recipe Calculator";

// --- GLOBAL STATE ---
window.lastCalculatedTotals = null;
let macroChartInstance = null;

// --- THEME TOGGLE LOGIC ---
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const themeToggle = document.getElementById('themeToggle');
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.body.classList.add('dark');
        themeToggle.textContent = '🌙';
    } else {
        themeToggle.textContent = '☀️';
    }
}

function toggleTheme() {
    const body = document.body;
    const themeToggle = document.getElementById('themeToggle');
    
    if (body.classList.contains('dark')) {
        body.classList.remove('dark');
        localStorage.setItem('theme', 'light');
        themeToggle.textContent = '☀️';
    } else {
        body.classList.add('dark');
        localStorage.setItem('theme', 'dark');
        themeToggle.textContent = '🌙';
    }
}

// --- INGREDIENT ROW LOGIC ---
function ingredientRowHTML() {
    return `
    <div class="ingredient-row flex gap-2 mb-2">
        <input type="text" class="query w-full p-2 border border-gray-300 rounded-lg text-sm" 
               placeholder="e.g., 100g chicken breast or 2 liters water" 
               value="" />
        <button class="bg-red-500 text-white rounded-lg p-2 text-sm hover:bg-red-600 w-10 flex-shrink-0 delete-btn" 
                onclick="this.parentElement.remove()">✕</button>
    </div>`;
}

function addIngredient() {
    document.getElementById('ingredientsContainer').insertAdjacentHTML('beforeend', ingredientRowHTML());
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('ingredientsContainer').children.length === 0) {
         document.getElementById('ingredientsContainer').insertAdjacentHTML('beforeend', ingredientRowHTML());
    }
    initializeTheme();
    convertUnit(); 
    loadSavedRecipes(); 
});

// --- API & CALCULATION LOGIC ---
async function getNutrition(query) {
    const maxRetries = 3;
    let currentRetry = 0;
    
    while (currentRetry < maxRetries) {
        try {
            // NOTE: This fetch call assumes a server-side proxy exists at /api/nutrition 
            // that handles the actual request to an external nutrition API (e.g., CalorieNinja).
            const res = await fetch(`/api/nutrition?query=${encodeURIComponent(query)}`);
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            return await res.json();
        } catch (error) {
            currentRetry++;
            if (currentRetry >= maxRetries) {
                return { items: [] };
            }
            const delay = Math.pow(2, currentRetry) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

async function calculateRecipe() {
    const rows = document.querySelectorAll('.ingredient-row');
    let totals = { cal: 0, fat: 0, carb: 0, protein: 0, sodium: 0, fiber: 0, sugar: 0, sat_fat: 0 };
    let successfulLookups = 0;
    document.getElementById('error-message').style.display = 'none'; 

    const calcBtn = document.querySelector('.calc-btn');
    const originalText = calcBtn.textContent;
    calcBtn.textContent = 'Calculating...';
    calcBtn.disabled = true;

    for (const row of rows) {
        const queryInput = row.querySelector('.query');
        if (!queryInput) continue;
        
        const query = queryInput.value.trim();
        if (!query || query.length < 3) continue; 
        
        const data = await getNutrition(query);
        if (data.items && data.items.length) {
            const item = data.items[0];
            totals.cal += item.calories || 0;
            totals.fat += item.fat_total_g || 0;
            totals.sat_fat += item.fat_saturated_g || 0; 
            totals.carb += item.carbohydrates_total_g || 0;
            totals.protein += item.protein_g || 0;
            totals.sodium += item.sodium_mg || 0;
            totals.fiber += item.fiber_g || 0;
            totals.sugar += item.sugar_g || 0;
            successfulLookups++;
        }
    }
    
    calcBtn.textContent = originalText;
    calcBtn.disabled = false;
    
    if (successfulLookups === 0) {
        document.getElementById('resultsCard').style.display = 'none';
        document.getElementById('error-message').style.display = 'block'; 
        window.lastCalculatedTotals = null;
        return;
    }

    window.lastCalculatedTotals = totals;
    document.getElementById('resultsCard').style.display = 'block';
    updateNutritionTable(totals);
    updateMacroChart(totals);
}

// --- UPDATE TABLE & CHART LOGIC ---
function updateNutritionTable(totals) {
    const tableBody = document.getElementById('nutritionTable');
    const formatG = (val) => `${val.toFixed(1)} g`;
    const formatMG = (val) => `${Math.round(val)} mg`;
    const formatCal = (val) => `${Math.round(val)}`;
    tableBody.innerHTML = `
        <div class="line thick font-bold text-base">Calories <span>${formatCal(totals.cal)}</span></div>
        <div class="line thick font-bold text-base">Total Fat <span>${formatG(totals.fat)}</span></div>
        <div class="line indent">Saturated Fat <span>${formatG(totals.sat_fat)}</span></div>
        <div class="line thick font-bold text-base">Sodium <span>${formatMG(totals.sodium)}</span></div>
        <div class="line thick font-bold text-base">Total Carbohydrate <span>${formatG(totals.carb)}</span></div>
        <div class="line indent">Dietary Fiber <span>${formatG(totals.fiber)}</span></div>
        <div class="line indent">Total Sugars <span>${formatG(totals.sugar)}</span></div>
        <div class="line thick font-bold text-base no-border">Protein <span>${formatG(totals.protein)}</span></div>
    `;
}

function updateMacroChart(totals) {
    const ctx = document.getElementById("macroChart").getContext("2d");
    if (macroChartInstance) macroChartInstance.destroy();

    const macroData = [totals.fat, totals.carb, totals.protein];
    const totalMacros = totals.fat + totals.carb + totals.protein;
    const pastelColors = ["#FFC3A0", "#C6E2FF", "#D7FFC6"]; 

    macroChartInstance = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: ["Fat (g)", "Carbs (g)", "Protein (g)"],
            datasets: [{
                data: macroData,
                backgroundColor: pastelColors,
                hoverOffset: 15,
                borderWidth: 2,
                borderColor: 'var(--card-bg)',
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: 'var(--text-color)',
                        generateLabels: (chart) => {
                            const data = chart.data;
                            if (data.labels.length && data.datasets.length) {
                                return data.labels.map((label, i) => {
                                    const value = data.datasets[0].data[i];
                                    const percentage = totalMacros > 0 ? ((value / totalMacros) * 100).toFixed(1) : 0;
                                    return {
                                        text: `${label}: ${value.toFixed(1)}g (${percentage}%)`,
                                        fillStyle: data.datasets[0].backgroundColor[i],
                                        strokeStyle: data.datasets[0].borderColor,
                                        lineWidth: data.datasets[0].borderWidth,
                                        hidden: isNaN(value),
                                        index: i
                                    };
                                });
                            }
                            return [];
                        }
                    }
                },
                title: {
                    display: true,
                    text: 'Macronutrient Split (by weight in grams)',
                    color: 'var(--text-color)',
                    font: { size: 14, weight: 'bold' }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            return `${label}: ${value.toFixed(1)}g (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// --- RECIPE SAVING & LOADING LOGIC ---
function saveRecipe() {
    let savedRecipes = JSON.parse(localStorage.getItem('nutrifind_recipes') || '[]');
    const currentIngredients = Array.from(document.querySelectorAll('.ingredient-row .query'))
                                       .map(input => input.value.trim())
                                       .filter(val => val.length > 0);
    if (currentIngredients.length === 0 || !window.lastCalculatedTotals) {
        alert("Please calculate the recipe nutrition before saving.");
        return;
    }

    const recipeName = prompt("Enter a name for your recipe (e.g., 'Mom's Chicken Soup'):");
    if (!recipeName || recipeName.trim() === "") {
        return;
    }
    
    const newRecipeId = Date.now();
    const newRecipe = {
        id: newRecipeId, 
        name: recipeName.trim(),
        ingredients: currentIngredients,
        totals: window.lastCalculatedTotals,
        date: new Date().toLocaleDateString()
    };

    savedRecipes.unshift(newRecipe); 
    localStorage.setItem('nutrifind_recipes', JSON.stringify(savedRecipes));

    alert(`Recipe "${newRecipe.name}" saved successfully!`);
    renderSavedRecipes(savedRecipes);
}

function loadSavedRecipes() {
    const savedRecipes = JSON.parse(localStorage.getItem('nutrifind_recipes') || '[]');
    renderSavedRecipes(savedRecipes);
}

function renderSavedRecipes(recipes) {
    const listContainer = document.getElementById('savedRecipesList');
    const card = document.getElementById('savedRecipesCard');
    listContainer.innerHTML = ''; 

    if (recipes.length === 0) {
        card.style.display = 'none';
        return;
    }

    card.style.display = 'block';
    recipes.forEach(recipe => {
        const ingredientsPreview = recipe.ingredients.slice(0, 3).join(', ') + (recipe.ingredients.length > 3 ? '...' : '');
        const html = `
            <div class="saved-recipe-item flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div>
                    <h4 class="font-bold text-lg">${recipe.name}</h4>
                    <p class="text-sm text-gray-600">
                        <b>Cal:</b> ${Math.round(recipe.totals.cal)} | 
                        <b>Protein:</b> ${recipe.totals.protein.toFixed(1)}g | 
                        <b>Carbs:</b> ${recipe.totals.carb.toFixed(1)}g | 
                        <b>Fat:</b> ${recipe.totals.fat.toFixed(1)}g 
                    </p>
                    <p class="text-xs text-gray-500 mt-1 italic">
                        Ingredients: ${ingredientsPreview}
                    </p>
                </div>
                <div class="flex gap-2 mt-3 sm:mt-0">
                    <button class="share-btn py-1 px-3 text-sm font-medium rounded-lg" onclick="alert('Viewing ingredients:\\n${recipe.ingredients.join('\\n')}')">View</button>
                    <button class="delete-btn py-1 px-3 text-sm font-medium rounded-lg" onclick="deleteRecipe(${recipe.id})">Delete</button>
                </div>
            </div>
        `;
        listContainer.insertAdjacentHTML('beforeend', html);
    });
}

function deleteRecipe(id) {
    let savedRecipes = JSON.parse(localStorage.getItem('nutrifind_recipes') || '[]');
    savedRecipes = savedRecipes.filter(recipe => recipe.id !== id);
    localStorage.setItem('nutrifind_recipes', JSON.stringify(savedRecipes));
    renderSavedRecipes(savedRecipes); 
    alert('Recipe deleted successfully.');
}


// --- UNIT CONVERSION ---
const CONVERSION_FACTORS = {
    'ml': 1, 'tsp': 4.92892, 'tbsp': 14.7868, 'fl_oz': 29.5735, 'cup': 236.588, 'l': 1000 
};
function convertUnit() {
    const amountInput = document.getElementById('convertAmount');
    const fromUnit = document.getElementById('convertFrom').value;
    const toUnit = document.getElementById('convertTo').value;
    const resultDisplay = document.getElementById('conversionResult');
    const amount = parseFloat(amountInput.value);
    if (isNaN(amount) || amount <= 0) {
        resultDisplay.textContent = "Please enter a valid amount.";
        return;
    }

    const baseUnitFactor = CONVERSION_FACTORS[fromUnit];
    const amountInML = amount * baseUnitFactor;
    const targetUnitFactor = CONVERSION_FACTORS[toUnit];
    const result = amountInML / targetUnitFactor;
    
    const fromUnitLabel = document.getElementById('convertFrom').options[document.getElementById('convertFrom').selectedIndex].text;
    const toUnitLabel = document.getElementById('convertTo').options[document.getElementById('convertTo').selectedIndex].text;

    resultDisplay.textContent = `${amount.toFixed(2)} ${fromUnitLabel} = ${result.toFixed(2)} ${toUnitLabel}`;
}

// --- COPY & SHARE UTILITIES ---
function copyIngredients() {
    const rows = document.querySelectorAll('.ingredient-row');
    let ingredientsList = [];
    rows.forEach(row => {
        const queryInput = row.querySelector('.query');
        const query = queryInput.value.trim();
        if (query) { ingredientsList.push(query); }
    });
    const textToCopy = ingredientsList.join('\n');
    if (textToCopy.length === 0) { return;
    }
    try {
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        const copyBtn = document.querySelector('.copy-ingredients-btn');
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        setTimeout(() => { copyBtn.textContent = originalText; }, 1500);
    } catch (err) {
        console.error('Could not copy ingredients: ', err);
    }
}

function copyTable() { 
    const recipeName = document.querySelector('h2.text-xl').textContent.includes('Total Recipe') 
                       ? 'Recipe Summary' : document.querySelector('h2.text-xl').textContent;

    // Header includes the website title and URL
    const header = `[${WEBSITE_TITLE}] - ${recipeName}\n${WEBSITE_URL}\n---\n`;
    const tableText = document.getElementById("nutritionTable").innerText;
    const textToCopy = header + tableText;
    try {
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        
        const copyBtn = document.querySelector('button[onclick="copyTable()"]');
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
            copyBtn.textContent = originalText;
        }, 1500);
    } catch (err) { console.error('Could not copy text: ', err);
    }
}

// --- UTILITY: Share Table (CONFIRMED WORKING VERSION) ---
async function shareTable() { 
    if (!window.lastCalculatedTotals) {
        alert("Please calculate the recipe nutrition before sharing.");
        return;
    }
    
    const t = window.lastCalculatedTotals;
    
    // 1. Generate the clean, templated text. 
    // This structure is confirmed to work without causing URL duplication on your system.
    const shareBody = `Check out my recipe nutrition facts from ${WEBSITE_TITLE}.\n\n` +
                      `*Calories - ${Math.round(t.cal)}*\n` +
                      `Total Fat - ${t.fat.toFixed(1)} g\n` +
                      `Saturated Fat - ${t.sat_fat.toFixed(1)} g\n` +
                      `Sodium - ${Math.round(t.sodium)} mg\n` +
                      `Total Carbohydrate - ${t.carb.toFixed(1)} g\n` +
                      `Dietary Fiber - ${t.fiber.toFixed(1)} g\n` +
                      `Total Sugars - ${t.sugar.toFixed(1)} g\n` +
                      `Protein - ${t.protein.toFixed(1)} g\n\n` + 
                      `Get started on your own recipes! `; // Space added at the end for clean formatting.

    if (navigator.share) { 
        try {
            await navigator.share({ 
                title: `${WEBSITE_TITLE} Results`, 
                text: shareBody,
                // The URL is included here to trigger the Rich Link Preview box at the top.
                url: WEBSITE_URL 
            });
        } catch (error) {
            console.error('Sharing failed or cancelled:', error);
        }
    } else { 
        alert(`Sharing not supported. Please use the 'Copy Nutrition Table' button or visit ${WEBSITE_URL}`);
    }
}
