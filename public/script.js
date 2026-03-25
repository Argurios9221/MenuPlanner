const cuisineEl = document.getElementById("cuisine");
const generateBtn = document.getElementById("generate");
const resetBtn = document.getElementById("reset");
const menuContainer = document.getElementById("menuContainer");
const basketContainer = document.getElementById("basketContainer");
const errorBox = document.getElementById("error");
const statusEl = document.getElementById("status");

let timerId = null;
let seconds = 0;

function startStatusTimer() {
  seconds = 0;
  statusEl.textContent = "Argurios is generating the menu\u2026 (0s)";
  if (timerId) clearInterval(timerId);
  timerId = setInterval(() => {
    seconds += 1;
    statusEl.textContent = `Argurios is generating the menu\u2026 (${seconds}s)`;
  }, 1000);
}

function stopStatusTimer(success) {
  if (timerId) { clearInterval(timerId); timerId = null; }
  statusEl.textContent = success
    ? `Argurios generated the menu in ${seconds}s.`
    : "An error occurred while generating.";
}

async function fetchMealDetails(mealId) {
  try {
    const resp = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${mealId}`);
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.meals ? data.meals[0] : null;
  } catch { return null; }
}

function extractIngredients(meal) {
  const ingredients = [];
  for (let i = 1; i <= 20; i++) {
    const ing = meal[`strIngredient${i}`];
    const measure = meal[`strMeasure${i}`];
    if (ing && ing.trim()) {
      ingredients.push({ name: ing.trim(), measure: measure ? measure.trim() : "" });
    }
  }
  return ingredients;
}

// Ingredient categorization by keywords
const categoryRules = [
  { name: "Meat & Poultry", icon: "\ud83e\udd69", keywords: ["chicken", "beef", "pork", "lamb", "turkey", "duck", "bacon", "sausage", "mince", "ham", "steak", "veal", "prosciutto", "salami", "chorizo", "pancetta"] },
  { name: "Fish & Seafood", icon: "\ud83d\udc1f", keywords: ["salmon", "tuna", "cod", "shrimp", "prawn", "fish", "anchov", "crab", "lobster", "mussel", "clam", "squid", "sardine", "mackerel"] },
  { name: "Dairy & Eggs", icon: "\ud83e\uddc0", keywords: ["milk", "cheese", "butter", "cream", "yogurt", "yoghurt", "egg", "mozzarella", "parmesan", "cheddar", "ricotta", "mascarpone", "feta", "gouda", "brie", "creme fraiche", "sour cream"] },
  { name: "Vegetables", icon: "\ud83e\udd66", keywords: ["onion", "garlic", "tomato", "potato", "carrot", "pepper", "celery", "spinach", "broccoli", "zucchini", "courgette", "aubergine", "eggplant", "mushroom", "lettuce", "cucumber", "cabbage", "kale", "pea", "bean", "corn", "asparagus", "leek", "shallot", "beetroot", "radish", "turnip", "squash", "pumpkin", "artichoke", "fennel", "rocket", "arugula", "spring onion", "green bean", "chilli", "jalapeno"] },
  { name: "Fruits", icon: "\ud83c\udf4e", keywords: ["apple", "banana", "lemon", "lime", "orange", "berry", "strawberr", "blueberr", "raspberr", "mango", "pineapple", "coconut", "grape", "peach", "pear", "plum", "cherry", "avocado", "fig", "date", "raisin", "sultana", "cranberr", "pomegranate"] },
  { name: "Grains & Pasta", icon: "\ud83c\udf5e", keywords: ["flour", "rice", "pasta", "bread", "spaghetti", "penne", "noodle", "oat", "couscous", "quinoa", "tortilla", "wrap", "lasagne", "macaroni", "fettuccine", "tagliatelle", "gnocchi", "cornflour", "breadcrumb", "pita", "baguette", "ciabatta", "focaccia"] },
  { name: "Spices & Herbs", icon: "\ud83c\udf3f", keywords: ["salt", "pepper", "cumin", "paprika", "cinnamon", "oregano", "basil", "thyme", "rosemary", "parsley", "cilantro", "coriander", "turmeric", "ginger", "nutmeg", "chili powder", "cayenne", "saffron", "bay leaf", "mint", "dill", "sage", "tarragon", "clove", "cardamom", "fennel seed", "mustard seed", "vanilla"] },
  { name: "Oils & Sauces", icon: "\ud83e\uded2", keywords: ["oil", "olive oil", "vinegar", "soy sauce", "worcestershire", "ketchup", "mayo", "mustard", "honey", "syrup", "sauce", "paste", "stock", "broth", "bouillon"] },
];

function categorizeIngredient(name) {
  const lower = name.toLowerCase();
  for (const cat of categoryRules) {
    if (cat.keywords.some(kw => lower.includes(kw))) return cat.name;
  }
  return "Other";
}

function getCategoryMeta(catName) {
  const found = categoryRules.find(c => c.name === catName);
  return found || { name: "Other", icon: "\ud83d\udce6" };
}

function renderMenu(data) {
  menuContainer.innerHTML = "";
  if (!data || !data.days) return;
  const mealTypes = ["Breakfast", "Lunch", "Dinner"];
  data.days.forEach((day) => {
    const card = document.createElement("div");
    card.className = "day-card";

    const name = document.createElement("div");
    name.className = "day-name";
    name.textContent = day.name;
    card.appendChild(name);

    const list = document.createElement("div");
    list.className = "meal-list";

    day.meals.forEach((m, idx) => {
      const item = document.createElement("div");
      item.className = "meal-item";

      const img = document.createElement("img");
      img.className = "meal-thumb";
      img.src = m.thumb + "/preview";
      img.alt = m.name;
      img.loading = "lazy";

      const info = document.createElement("div");
      info.className = "meal-info";

      const type = document.createElement("span");
      type.className = "meal-type";
      type.textContent = mealTypes[idx] || "";

      const mealName = document.createElement("span");
      mealName.className = "meal-name";
      mealName.textContent = m.name;

      info.appendChild(type);
      info.appendChild(mealName);
      item.appendChild(img);
      item.appendChild(info);

      const actions = document.createElement("div");
      actions.className = "meal-actions";
      const recipeBtn = document.createElement("button");
      recipeBtn.className = "btn-recipe";
      recipeBtn.textContent = "Recipe";
      recipeBtn.dataset.mealId = m.id;
      recipeBtn.addEventListener("click", () => showRecipe(m.id));
      actions.appendChild(recipeBtn);
      item.appendChild(actions);

      list.appendChild(item);
    });

    card.appendChild(list);
    menuContainer.appendChild(card);
  });
}

function renderBasket(ingredients) {
  basketContainer.innerHTML = "";
  if (!ingredients || !ingredients.length) return;

  // Deduplicate by name (keep first measure)
  const seen = new Map();
  for (const ing of ingredients) {
    const key = ing.name.toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, ing);
    } else if (ing.measure && !seen.get(key).measure) {
      seen.set(key, ing);
    }
  }

  // Group by category
  const groups = {};
  for (const [, ing] of seen) {
    const cat = categorizeIngredient(ing.name);
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(ing);
  }

  // Sort categories: defined order first, "Other" last
  const catOrder = categoryRules.map(c => c.name);
  const sortedCats = Object.keys(groups).sort((a, b) => {
    const ai = catOrder.indexOf(a);
    const bi = catOrder.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  for (const catName of sortedCats) {
    const meta = getCategoryMeta(catName);
    const section = document.createElement("div");
    section.className = "basket-category";

    const header = document.createElement("div");
    header.className = "basket-category-header";
    header.innerHTML = `<span class="cat-icon">${meta.icon}</span> ${catName}`;

    const items = document.createElement("div");
    items.className = "basket-items";

    groups[catName].sort((a, b) => a.name.localeCompare(b.name));
    for (const ing of groups[catName]) {
      const chip = document.createElement("span");
      chip.className = "basket-item";
      chip.textContent = ing.measure ? `${ing.name} \u2013 ${ing.measure}` : ing.name;
      items.appendChild(chip);
    }

    section.appendChild(header);
    section.appendChild(items);
    basketContainer.appendChild(section);
  }
}

// Recipe modal
const recipeOverlay = document.getElementById("recipeOverlay");
const recipeTitle = document.getElementById("recipeTitle");
const recipeBody = document.getElementById("recipeBody");
const recipeClose = document.getElementById("recipeClose");

recipeClose.addEventListener("click", () => {
  recipeOverlay.classList.remove("visible");
});

recipeOverlay.addEventListener("click", (e) => {
  if (e.target === recipeOverlay) recipeOverlay.classList.remove("visible");
});

async function showRecipe(mealId) {
  recipeOverlay.classList.add("visible");
  recipeTitle.textContent = "Recipe";
  recipeBody.innerHTML = '<div class="recipe-loading">Loading recipe...</div>';

  const details = await fetchMealDetails(mealId);
  if (!details) {
    recipeBody.innerHTML = '<div class="recipe-loading">Could not load recipe.</div>';
    return;
  }

  recipeTitle.textContent = details.strMeal;

  const ingredients = extractIngredients(details);
  const ingListHTML = ingredients.map(
    ing => `<li>${ing.name}${ing.measure ? " \u2013 " + ing.measure : ""}</li>`
  ).join("");

  recipeBody.innerHTML = `
    <img src="${details.strMealThumb}" alt="${details.strMeal}">
    <div class="recipe-section-title">Ingredients</div>
    <ul class="recipe-ingredients-list">${ingListHTML}</ul>
    <div class="recipe-section-title">Instructions</div>
    <div class="recipe-instructions">${details.strInstructions}</div>
  `;
}

// Tabs
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    if (tab.dataset.tab === "menu") {
      menuContainer.style.display = "grid";
      basketContainer.style.display = "none";
    } else {
      menuContainer.style.display = "none";
      basketContainer.style.display = "grid";
    }
  });
});

// Reset
resetBtn.addEventListener("click", () => {
  errorBox.style.display = "none";
  menuContainer.innerHTML = "";
  basketContainer.innerHTML = "";
  if (timerId) { clearInterval(timerId); timerId = null; }
  statusEl.textContent = "Ready to generate.";
});

// Generate menu from TheMealDB
generateBtn.addEventListener("click", async () => {
  errorBox.style.display = "none";
  startStatusTimer();
  generateBtn.disabled = true;

  try {
    const selectedCuisine = cuisineEl.value;
    let allMeals = [];

    if (selectedCuisine === "vegetarian") {
      const resp = await fetch("https://www.themealdb.com/api/json/v1/1/filter.php?c=Vegetarian");
      if (!resp.ok) throw new Error("Failed to fetch from TheMealDB");
      const json = await resp.json();
      allMeals = json.meals || [];
    } else if (selectedCuisine === "vegan") {
      const resp = await fetch("https://www.themealdb.com/api/json/v1/1/filter.php?c=Vegan");
      if (!resp.ok) throw new Error("Failed to fetch from TheMealDB");
      const json = await resp.json();
      allMeals = json.meals || [];
    } else if (selectedCuisine === "glutenfree") {
      const r1 = await fetch("https://www.themealdb.com/api/json/v1/1/filter.php?c=Vegetarian");
      const r2 = await fetch("https://www.themealdb.com/api/json/v1/1/filter.php?c=Vegan");
      if (r1.ok) { const j = await r1.json(); allMeals = allMeals.concat(j.meals || []); }
      if (r2.ok) { const j = await r2.json(); allMeals = allMeals.concat(j.meals || []); }
    } else if (selectedCuisine === "italian") {
      const resp = await fetch("https://www.themealdb.com/api/json/v1/1/filter.php?a=Italian");
      if (!resp.ok) throw new Error("Failed to fetch from TheMealDB");
      const json = await resp.json();
      allMeals = json.meals || [];
    } else {
      // Mix: pick from several random areas
      const areas = ["Italian", "British", "American", "French", "Spanish", "Mexican", "Chinese", "Indian", "Turkish", "German", "Japanese"];
      const picked = areas.sort(() => Math.random() - 0.5).slice(0, 4);
      for (const area of picked) {
        const resp = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?a=${encodeURIComponent(area)}`);
        if (resp.ok) {
          const json = await resp.json();
          if (json.meals) allMeals = allMeals.concat(json.meals);
        }
      }
    }

    if (!allMeals.length) throw new Error("No meals found!");

    // Shuffle
    allMeals = allMeals.sort(() => Math.random() - 0.5);

    // Recycle if fewer than 21 meals
    const needed = 21;
    const filled = [];
    for (let i = 0; i < needed; i++) {
      filled.push(allMeals[i % allMeals.length]);
    }

    const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const menu = { days: [] };
    for (let i = 0; i < 7; i++) {
      menu.days.push({
        name: daysOfWeek[i],
        meals: [
          { name: filled[i * 3].strMeal, thumb: filled[i * 3].strMealThumb, id: filled[i * 3].idMeal },
          { name: filled[i * 3 + 1].strMeal, thumb: filled[i * 3 + 1].strMealThumb, id: filled[i * 3 + 1].idMeal },
          { name: filled[i * 3 + 2].strMeal, thumb: filled[i * 3 + 2].strMealThumb, id: filled[i * 3 + 2].idMeal }
        ]
      });
    }
    renderMenu(menu);

    // Basket: fetch ingredient details for unique meals
    const uniqueMeals = [...new Map(filled.map(m => [m.idMeal, m])).values()];
    const allIngredients = [];
    for (const meal of uniqueMeals) {
      const details = await fetchMealDetails(meal.idMeal);
      if (details) {
        allIngredients.push(...extractIngredients(details));
      }
    }
    renderBasket(allIngredients);

    stopStatusTimer(true);
  } catch (err) {
    errorBox.style.display = "block";
    errorBox.textContent = "Error: " + err.message;
    stopStatusTimer(false);
  } finally {
    generateBtn.disabled = false;
  }
});
