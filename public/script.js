const cuisineEl = document.getElementById("cuisine");
const generateBtn = document.getElementById("generate");
const resetBtn = document.getElementById("reset");
const menuContainer = document.getElementById("menuContainer");
const basketContainer = document.getElementById("basketContainer");
const errorBox = document.getElementById("error");
const statusEl = document.getElementById("status");

// TheMealDB категории по area или category
const cuisineToMealDB = {
  mix: "",
  vegetarian: "Vegetarian",
  vegan: "Vegan",
  glutenfree: "",
  italian: "Italian"
};

let timerId = null;
let seconds = 0;

function startStatusTimer() {
  seconds = 0;
  statusEl.textContent = "Генериране на меню… (0s)";
  if (timerId) clearInterval(timerId);
  timerId = setInterval(() => {
    seconds += 1;
    statusEl.textContent = `Генериране на меню… (${seconds}s)`;
  }, 1000);
}

function stopStatusTimer(success) {
  if (timerId) { clearInterval(timerId); timerId = null; }
  statusEl.textContent = success
    ? `Менюто е генерирано за ${seconds}s.`
    : "Възникна грешка при генерирането.";
}

// Вземи детайлна информация за ястие от TheMealDB
async function fetchMealDetails(mealId) {
  try {
    const resp = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${mealId}`);
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.meals ? data.meals[0] : null;
  } catch { return null; }
}

// Извлечи съставки от детайлен обект на ястие
function extractIngredients(meal) {
  const ingredients = [];
  for (let i = 1; i <= 20; i++) {
    const ing = meal[`strIngredient${i}`];
    const measure = meal[`strMeasure${i}`];
    if (ing && ing.trim()) {
      ingredients.push(measure ? `${ing.trim()} - ${measure.trim()}` : ing.trim());
    }
  }
  return ingredients;
}

function renderMenu(data) {
  menuContainer.innerHTML = "";
  if (!data || !data.days) return;
  data.days.forEach((day) => {
    const card = document.createElement("div");
    card.className = "day-card";
    const name = document.createElement("div");
    name.className = "day-name";
    name.textContent = day.name;
    const list = document.createElement("div");
    list.className = "meal-list";
    day.meals.forEach((m) => {
      const row = document.createElement("div");
      row.textContent = m;
      list.appendChild(row);
    });
    card.appendChild(name);
    card.appendChild(list);
    menuContainer.appendChild(card);
  });
}

function renderBasket(ingredients) {
  basketContainer.innerHTML = "";
  if (!ingredients || !ingredients.length) return;
  const card = document.createElement("div");
  card.className = "day-card";
  const title = document.createElement("div");
  title.className = "day-name";
  title.textContent = "Списък за пазаруване";
  const list = document.createElement("div");
  list.className = "meal-list";
  // Премахни дубликати
  const unique = [...new Set(ingredients)];
  unique.sort();
  unique.forEach((item) => {
    const row = document.createElement("div");
    row.textContent = item;
    list.appendChild(row);
  });
  card.appendChild(title);
  card.appendChild(list);
  basketContainer.appendChild(card);
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
  statusEl.textContent = "Готово за генериране.";
});

// Generate — изцяло TheMealDB
generateBtn.addEventListener("click", async () => {
  errorBox.style.display = "none";
  startStatusTimer();
  generateBtn.disabled = true;

  try {
    const selectedCuisine = cuisineEl.value;
    let allMeals = [];

    if (selectedCuisine === "vegetarian") {
      // TheMealDB category filter
      const resp = await fetch("https://www.themealdb.com/api/json/v1/1/filter.php?c=Vegetarian");
      if (!resp.ok) throw new Error("Грешка при заявка към TheMealDB");
      const json = await resp.json();
      allMeals = json.meals || [];
    } else if (selectedCuisine === "vegan") {
      const resp = await fetch("https://www.themealdb.com/api/json/v1/1/filter.php?c=Vegan");
      if (!resp.ok) throw new Error("Грешка при заявка към TheMealDB");
      const json = await resp.json();
      allMeals = json.meals || [];
    } else if (selectedCuisine === "glutenfree") {
      // TheMealDB няма категория "gluten free", затова вземаме Vegetarian + Vegan като приближение
      const r1 = await fetch("https://www.themealdb.com/api/json/v1/1/filter.php?c=Vegetarian");
      const r2 = await fetch("https://www.themealdb.com/api/json/v1/1/filter.php?c=Vegan");
      if (r1.ok) { const j = await r1.json(); allMeals = allMeals.concat(j.meals || []); }
      if (r2.ok) { const j = await r2.json(); allMeals = allMeals.concat(j.meals || []); }
    } else if (selectedCuisine === "italian") {
      const resp = await fetch("https://www.themealdb.com/api/json/v1/1/filter.php?a=Italian");
      if (!resp.ok) throw new Error("Грешка при заявка към TheMealDB");
      const json = await resp.json();
      allMeals = json.meals || [];
    } else {
      // Mix: вземи от няколко различни области
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

    if (!allMeals.length) throw new Error("Няма намерени ястия!");

    // Разбъркай ястията
    allMeals = allMeals.sort(() => Math.random() - 0.5);

    // Ако няма достатъчно, рециклирай за да запълним 21 слота (7 дни x 3 хранения)
    const needed = 21;
    const filled = [];
    for (let i = 0; i < needed; i++) {
      filled.push(allMeals[i % allMeals.length]);
    }

    const daysOfWeek = ["Понеделник", "Вторник", "Сряда", "Четвъртък", "Петък", "Събота", "Неделя"];
    const menu = { days: [] };
    for (let i = 0; i < 7; i++) {
      menu.days.push({
        name: daysOfWeek[i],
        meals: [
          "Закуска: " + filled[i * 3].strMeal,
          "Обяд: " + filled[i * 3 + 1].strMeal,
          "Вечеря: " + filled[i * 3 + 2].strMeal
        ]
      });
    }
    renderMenu(menu);

    // Кошница: вземи съставките за уникалните ястия
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
    errorBox.textContent = "Грешка: " + err.message;
    stopStatusTimer(false);
  } finally {
    generateBtn.disabled = false;
  }
});
