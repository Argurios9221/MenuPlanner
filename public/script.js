const promptEl = document.getElementById("prompt");
const peopleEl = document.getElementById("people");
const varietyEl = document.getElementById("variety");
const dietEl = document.getElementById("diet");
const cuisineEl = document.getElementById("cuisine");

// Картографиране на стойности към TheMealDB категории
const cuisineToMealDB = {
  mix: "",
  vegetarian: "Vegetarian",
  vegan: "Vegan",
  glutenfree: "",
  bulgarian: "",
  german: "German",
  italian: "Italian",
  spanish: "Spanish",
  turkish: "Turkish"
};

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
  statusEl.textContent = "Argurios генерира меню… (0s)";
  if (timerId) clearInterval(timerId);
  timerId = setInterval(() => {
    seconds += 1;
    statusEl.textContent = `Argurios генерира меню… (${seconds}s)`;
  }, 1000);
}

function stopStatusTimer(success = true) {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
  if (success) {
    statusEl.textContent = `Argurios генерира менюто за генерирано за ${seconds}s.`;
  } else {
    statusEl.textContent = "Възникна грешка при генерирането.";
  }
}

function tryExtractJson(text) {
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first === -1 || last === -1) return null;
  try {
    return JSON.parse(text.slice(first, last + 1));
  } catch {
    return null;
  }
}

function renderMenu(data) {
  menuContainer.innerHTML = "";
  data.days.forEach((day) => {
    const card = document.createElement("div");
    card.className = "day-card";

    const name = document.createElement("div");
    name.className = "day-name";
    name.textContent = day.name;

    const list = document.createElement("div");
    list.className = "meal-list";

    day.meals.forEach((m) => {
      const mealRow = document.createElement("div");
      mealRow.style.display = "flex";
      mealRow.style.alignItems = "center";
      mealRow.style.gap = "8px";

      const mealName = document.createElement("span");
      mealName.textContent = m;
      mealRow.appendChild(mealName);

      const recipeBtn = document.createElement("button");
      recipeBtn.textContent = "Рецепта";
      recipeBtn.className = "btn-secondary";
      recipeBtn.style.fontSize = "13px";
      recipeBtn.style.padding = "4px 12px";

      let recipeDiv = null;

      recipeBtn.onclick = async () => {
        // Ако вече има рецепта, скрий я
        if (recipeDiv && recipeDiv.style.display !== "none") {
          recipeDiv.style.display = "none";
          return;
        }
        recipeBtn.disabled = true;
        recipeBtn.textContent = "Зарежда...";
        try {
          const res = await fetch("/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: `Дай ми рецепта на български за: ${m}. Върни само текст без обяснения и без JSON.` })
          });
          let recipe = "(няма рецепта)";
          if (res.ok) {
            const data = await res.json();
            recipe = data.text || recipe;
          } else {
            recipe = "Грешка при зареждане на рецептата.";
          }
          // Показване на рецептата под ястието (на нов ред)
          if (!recipeDiv) {
            recipeDiv = document.createElement("div");
            recipeDiv.className = "recipe-box";
            recipeDiv.style.marginTop = "6px";
            recipeDiv.style.fontSize = "14px";
            recipeDiv.style.background = "#f8fff4";
            recipeDiv.style.border = "1px solid #e8ece8";
            recipeDiv.style.borderRadius = "8px";
            recipeDiv.style.padding = "8px";
            recipeDiv.style.display = "block";

            // Бутон за затваряне
            const closeBtn = document.createElement("button");
            closeBtn.textContent = "Затвори";
            closeBtn.className = "btn-secondary";
            closeBtn.style.fontSize = "12px";
            closeBtn.style.marginTop = "8px";
            closeBtn.onclick = () => {
              recipeDiv.style.display = "none";
            };
            recipeDiv.appendChild(closeBtn);
            // Текст на рецептата
            const recipeText = document.createElement("div");
            recipeText.className = "recipe-text";
            recipeText.style.marginTop = "6px";
            recipeDiv.appendChild(recipeText);
            // Добавяме под mealRow, на нов ред
            mealRow.parentNode.insertBefore(recipeDiv, mealRow.nextSibling);
          } else {
            recipeDiv.style.display = "block";
          }
          recipeDiv.querySelector(".recipe-text").textContent = recipe;
        } finally {
          recipeBtn.disabled = false;
          recipeBtn.textContent = "Рецепта";
        }
      };
      mealRow.appendChild(recipeBtn);
      list.appendChild(mealRow);
    });

    card.appendChild(name);
    card.appendChild(list);
    menuContainer.appendChild(card);
  });
    btn.addEventListener("click", async (e) => {
      const mealName = btn.getAttribute("data-meal");
      const recipeDiv = btn.parentElement.querySelector('.recipe-details');
      if (recipeDiv.style.display === 'block') {
        recipeDiv.style.display = 'none';
        return;
      }
      btn.disabled = true;
      recipeDiv.innerHTML = 'Зареждане...';
      recipeDiv.style.display = 'block';
      // Вземи рецептата от TheMealDB
      try {
        const resp = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(mealName)}`);
        const data = await resp.json();
        if (data.meals && data.meals.length > 0) {
          const meal = data.meals[0];
          let ingredients = '';
          for (let i = 1; i <= 20; i++) {
            const ing = meal[`strIngredient${i}`];
            const measure = meal[`strMeasure${i}`];
            if (ing && ing.trim()) {
              ingredients += `<li>${ing} - ${measure}</li>`;
            }
          }
          recipeDiv.innerHTML = `
            <strong>${meal.strMeal}</strong><br>
            <img src="${meal.strMealThumb}" alt="${meal.strMeal}" style="max-width:120px;"><br>
            <b>Съставки:</b><ul>${ingredients}</ul>
            <b>Инструкции:</b><br><span style="white-space:pre-line;">${meal.strInstructions}</span>
          `;
        } else {
          recipeDiv.innerHTML = 'Няма намерена рецепта.';
        }
      } catch (err) {
        recipeDiv.innerHTML = 'Грешка при зареждане на рецептата.';
      }
      btn.disabled = false;
    });

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

resetBtn.addEventListener("click", () => {
  promptEl.value = "";
  errorBox.style.display = "none";
  menuContainer.innerHTML = "";
  basketContainer.innerHTML = "";
  stopStatusTimer(false);
  statusEl.textContent = "Готово за генериране.";
});

generateBtn.addEventListener("click", async () => {
  errorBox.style.display = "none";
  startStatusTimer();
  generateBtn.disabled = true;

  try {

    // Ако е избрана публична кухня, тегли от TheMealDB
    const selectedCuisine = cuisineEl.value;
    const mealDBCategory = cuisineToMealDB[selectedCuisine] || "";
    if (mealDBCategory) {
      try {
        const resp = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?a=${encodeURIComponent(mealDBCategory)}`);
        if (!resp.ok) throw new Error("Грешка при заявка към TheMealDB: " + resp.status);
        const data = await resp.json();
        let meals = data.meals || [];
        if (!meals.length) {
          errorBox.style.display = "block";
          errorBox.textContent = "Няма намерени ястия за избраната кухня!";
          stopStatusTimer(false);
          generateBtn.disabled = false;
          return;
        }
        // Разбъркай и вземи 21 ястия (7 дни x 3 хранения)
        meals = meals.sort(() => Math.random() - 0.5).slice(0, 21);
        // Състави меню
        const daysOfWeek = ["Понеделник", "Вторник", "Сряда", "Четвъртък", "Петък", "Събота", "Неделя"];
        const menu = { days: [] };
        for (let i = 0; i < 7; i++) {
          menu.days.push({
            name: daysOfWeek[i],
            meals: [
              meals[i * 3]?.strMeal || "-",
              meals[i * 3 + 1]?.strMeal || "-",
              meals[i * 3 + 2]?.strMeal || "-"
            ]
          });
        }
        renderMenu(menu);
        stopStatusTimer(true);
        generateBtn.disabled = false;
        basketContainer.innerHTML = "";
        return;
      } catch (err) {
        errorBox.style.display = "block";
        errorBox.textContent = "Грешка при заявка към TheMealDB: " + err.message;
        stopStatusTimer(false);
        generateBtn.disabled = false;
        return;
      }
    }

    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: fullPrompt })
    });


    if (!res.ok) {
      const errorText = await res.text();
      throw new Error("Грешка от сървъра: " + errorText);
    }
    const data = await res.json();
    const text = data.text;

    const menuJson = tryExtractJson(text);
    if (!menuJson) {
      errorBox.style.display = "block";
      errorBox.textContent = "Менюто не е валиден JSON.";
      stopStatusTimer(false);
      generateBtn.disabled = false;
      return;
    }

    renderMenu(menuJson);

    const basketPrompt = `
Извлечи всички продукти от следното меню и ги върни като валиден JSON, като за всеки продукт добавиш бройка или грамаж (например: "Яйца 10 бр.", "Ориз 500g"):
{
  "meat": [],
  "dairy": [],
  "vegetables": [],
  "fruits": [],
  "other": []
}
ВАЖНО: Не добавяй никакви обяснения, коментари, текст преди или след JSON-а. Започни и завърши отговора си само с { и }.
Меню:
${text}
`;

    const basketRes = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: basketPrompt })
    });


    if (!basketRes.ok) {
      const errorText = await basketRes.text();
      throw new Error("Грешка от сървъра: " + errorText);
    }
    const basketData = await basketRes.json();
    const basketText = basketData.text;
    const basketJson = tryExtractJson(basketText);

    if (basketJson) renderBasket(basketJson);

    stopStatusTimer(true);
  } catch (err) {
    errorBox.style.display = "block";
    errorBox.textContent = "Грешка: " + err.message;
    stopStatusTimer(false);
  } finally {
    generateBtn.disabled = false;
  }
