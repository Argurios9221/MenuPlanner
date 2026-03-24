const promptEl = document.getElementById("prompt");
const peopleEl = document.getElementById("people");
const varietyEl = document.getElementById("variety");
const dietEl = document.getElementById("diet");

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
    statusEl.textContent = `Менюто е генерирано за ${seconds}s.`;
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
      const div = document.createElement("div");
      div.textContent = m;
      list.appendChild(div);
    });

    card.appendChild(name);
    card.appendChild(list);
    menuContainer.appendChild(card);
  });
}

function renderBasket(data) {
  basketContainer.innerHTML = "";

  const categories = {
    meat: "🥩 Месо",
    dairy: "🥛 Млечни",
    vegetables: "🥬 Зеленчуци",
    fruits: "🍎 Плодове",
    other: "🧂 Други"
  };

  for (const key in categories) {
    const card = document.createElement("div");
    card.className = "day-card";

    const name = document.createElement("div");
    name.className = "day-name";
    name.textContent = categories[key];

    const list = document.createElement("div");
    list.className = "meal-list";

    (data[key] || []).forEach((item) => {
      const div = document.createElement("div");
      div.textContent = item;
      list.appendChild(div);
    });

    card.appendChild(name);
    card.appendChild(list);
    basketContainer.appendChild(card);
  }
}

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
    const fullPrompt = `
Генерирай седмично меню за ${peopleEl.value} души.
Разнообразие: ${varietyEl.value}.
Диета: ${dietEl.value}.
${promptEl.value}
`;

    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: fullPrompt })
    });

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
Извлечи всички продукти от следното меню и ги върни като JSON:

{
  "meat": [],
  "dairy": [],
  "vegetables": [],
  "fruits": [],
  "other": []
}

Меню:
${text}
`;

    const basketRes = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: basketPrompt })
    });

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
});