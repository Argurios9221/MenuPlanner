// Shopping basket management
import { categorizeIngredient, extractIngredients, fetchMealDetails } from './api.js';
import { getCheckedItems, saveCheckedItems } from './storage.js';

// ---------- Measure parsing & aggregation ----------

const UNIT_TO_GRAMS = {
  g: 1, gr: 1, gram: 1, grams: 1,
  kg: 1000, kilo: 1000,
  mg: 0.001,
  ml: 1, milliliter: 1, millilitre: 1,
  l: 1000, liter: 1000, litre: 1000, lt: 1000,
  cl: 10,
  oz: 28.35, ounce: 28.35, ounces: 28.35,
  lb: 453.6, lbs: 453.6, pound: 453.6, pounds: 453.6,
  cup: 240, cups: 240,
  tbsp: 15, tablespoon: 15, tablespoons: 15,
  tsp: 5, teaspoon: 5, teaspoons: 5,
};

const UNIT_ALIASES = {
  g: 'g', gr: 'g', gram: 'g', grams: 'g',
  kg: 'kg', kilo: 'kg',
  mg: 'mg',
  ml: 'ml', milliliter: 'ml', millilitre: 'ml',
  l: 'l', liter: 'l', litre: 'l', lt: 'l',
  cl: 'cl',
  oz: 'oz', ounce: 'oz', ounces: 'oz',
  lb: 'lb', lbs: 'lb', pound: 'lb', pounds: 'lb',
  cup: 'cup', cups: 'cup',
  tbsp: 'tbsp', tablespoon: 'tbsp', tablespoons: 'tbsp',
  tsp: 'tsp', teaspoon: 'tsp', teaspoons: 'tsp',
  pcs: 'pcs', pc: 'pcs', piece: 'pcs', pieces: 'pcs',
  clove: 'pcs', cloves: 'pcs', slice: 'pcs', slices: 'pcs', whole: 'pcs',
};

function parseSingleMeasure(str) {
  if (!str) {
    return null;
  }
  const s = String(str).trim().toLowerCase();
  let amount = 0;
  let rawUnit = '';
  // fraction: "1/2 cup"
  const fracM = s.match(/^(\d+)\s*\/\s*(\d+)\s*([a-z]*)/);
  // decimal/integer: "200g", "1.5 kg", "3"
  const numM = s.match(/^(\d+(?:[.,]\d+)?)\s*([a-z]*)/);
  if (fracM) {
    amount = parseInt(fracM[1]) / parseInt(fracM[2]);
    rawUnit = fracM[3] || '';
  } else if (numM) {
    amount = parseFloat(numM[1].replace(',', '.'));
    rawUnit = numM[2] || '';
  }
  if (!amount || amount <= 0) {
    return null;
  }
  const unit = UNIT_ALIASES[rawUnit] ?? (rawUnit === '' ? 'pcs' : null);
  if (!unit) {
    return null;
  }
  const grams = UNIT_TO_GRAMS[rawUnit] ? amount * UNIT_TO_GRAMS[rawUnit] : 0;
  return { amount, unit, grams };
}

export function computeIngredientTotals(measureCounts) {
  const byUnit = new Map();
  let totalGrams = 0;
  for (const [measure, cnt] of Object.entries(measureCounts)) {
    const parsed = parseSingleMeasure(measure);
    if (parsed && parsed.amount > 0) {
      byUnit.set(parsed.unit, (byUnit.get(parsed.unit) || 0) + parsed.amount * cnt);
      if (parsed.grams > 0) {
        totalGrams += parsed.grams * cnt;
      }
    }
  }
  const parts = [];
  for (const [unit, total] of byUnit) {
    const rounded = total % 1 === 0 ? total : parseFloat(total.toFixed(1));
    parts.push(unit === 'pcs' ? `${rounded} pcs` : `${rounded}${unit}`);
  }
  return {
    displayMeasure: parts.join(' + '),
    totalGrams: Math.round(totalGrams),
    measures: Object.keys(measureCounts),
  };
}

const INGREDIENT_ALIASES = {
  tomatoes: 'tomato',
  onions: 'onion',
  eggs: 'egg',
  potatoes: 'potato',
  carrots: 'carrot',
  cucumbers: 'cucumber',
  peppers: 'pepper',
  mushrooms: 'mushroom',
  beans: 'bean',
  chickpeas: 'chickpea',
  lentils: 'lentil',
};

function normalizePantryToken(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-zа-яё\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isPantryIngredient(name, pantrySet) {
  if (!pantrySet || pantrySet.size === 0) {
    return false;
  }
  const token = normalizePantryToken(name);
  if (!token) {
    return false;
  }
  if (pantrySet.has(token)) {
    return true;
  }
  return Array.from(pantrySet).some((pantryToken) => token.includes(pantryToken) || pantryToken.includes(token));
}

export async function buildBasket(menu) {
  const ingredients = {};
  const pantrySet = new Set((menu?.options?.pantry || []).map(normalizePantryToken).filter(Boolean));

  const meals = menu.days.flatMap((day) => day.meals);

  await Promise.all(
    meals.map(async (meal) => {
      if (!meal.ingredients || !Array.isArray(meal.ingredients) || meal.ingredients.length === 0) {
        try {
          const details = await fetchMealDetails(meal.idMeal);
          meal.ingredients = extractIngredients(details);
        } catch (error) {
          console.error(`Failed to load ingredients for meal ${meal.idMeal}:`, error);
          meal.ingredients = [];
        }
      }
    })
  );

  for (const day of menu.days) {
    for (const meal of day.meals) {
      if (meal.ingredients && Array.isArray(meal.ingredients)) {
        for (const ingredient of meal.ingredients) {
          if (isPantryIngredient(ingredient.name, pantrySet)) {
            continue;
          }
          const key = normalizeIngredientKey(ingredient.name);
          if (!ingredients[key]) {
            ingredients[key] = {
              name: ingredient.name,
              category: categorizeIngredient(ingredient.name),
              measureCounts: {},
              count: 0,
            };
          }
          if (ingredient.measure) {
            const m = String(ingredient.measure).trim();
            if (m) {
              ingredients[key].measureCounts[m] = (ingredients[key].measureCounts[m] || 0) + 1;
            }
          }
          ingredients[key].count += 1;
        }
      }
    }
  }

  // Compute aggregated display measure and total grams for each ingredient
  for (const ing of Object.values(ingredients)) {
    const totals = computeIngredientTotals(ing.measureCounts || {});
    ing.displayMeasure = totals.displayMeasure;
    ing.totalGrams = totals.totalGrams;
    ing.measures = totals.measures;
    delete ing.measureCounts;
  }

  return groupByCategory(ingredients);
}

function normalizeIngredientKey(name) {
  const normalized = String(name || '')
    .toLowerCase()
    .replace(/[^a-zа-яё\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (/\bflour\b|брашн/.test(normalized)) {
    return 'flour';
  }
  if (/\brice\b|basmati|jasmine|arborio|risotto\s+rice|long\s+grain\s+rice|short\s+grain\s+rice|brown\s+rice|ориз/.test(normalized)) {
    return 'rice';
  }
  if (/\bpasta\b|spaghetti|penne|fusilli|macaroni|linguine|tagliatelle|farfalle|rigatoni|макарон|спагет|паста/.test(normalized)) {
    return 'pasta';
  }
  if ((/\bmilk\b|мляко/.test(normalized)) && !(/\bcoconut milk\b|\balmond milk\b|\bsoy milk\b|\boat milk\b|кокос|бадем|соево|овесено/.test(normalized))) {
    return 'milk';
  }
  if (/\bgreen beans?\b|\bstring beans?\b|зелен\s+фасул/.test(normalized)) {
    return 'green_bean';
  }
  if (/\bharicot\b|\bcannellini\b|\bnavy bean\b|\bwhite bean\b|зрял\s+боб|бял\s+боб/.test(normalized)) {
    return 'bean';
  }
  if (/\bchickpeas?\b|\bgarbanzo\b|нахут/.test(normalized)) {
    return 'chickpea';
  }
  if (/\blentils?\b|леща/.test(normalized)) {
    return 'lentil';
  }
  if (/\btomatoes?\b|\bcherry tomato\b|домат/.test(normalized)) {
    return 'tomato';
  }
  if (/\bonions?\b|\bred onion\b|\bwhite onion\b|\byellow onion\b|лук/.test(normalized)) {
    return 'onion';
  }
  if (/\bpotatoes?\b|картоф/.test(normalized)) {
    return 'potato';
  }
  if (/\bcarrots?\b|морков/.test(normalized)) {
    return 'carrot';
  }
  if (/\bcucumbers?\b|крастав/.test(normalized)) {
    return 'cucumber';
  }
  if (/\bpeppers?\b|\bbell pepper\b|чуш/.test(normalized)) {
    return 'pepper';
  }
  if (/\bmushrooms?\b|\bchampignon\b|гъб/.test(normalized)) {
    return 'mushroom';
  }
  if (/\beggs?\b|яйц/.test(normalized)) {
    return 'egg';
  }
  if (/\bchicken\b|пилешк|пиле/.test(normalized)) {
    return 'chicken';
  }
  if (/\bbeef\b|телешк/.test(normalized)) {
    return 'beef';
  }
  if (/\bpork\b|свинск/.test(normalized)) {
    return 'pork';
  }
  if (/\blamb\b|агнешк/.test(normalized)) {
    return 'lamb';
  }
  if (/\bsalmon\b|сьомг/.test(normalized)) {
    return 'salmon';
  }
  if (/\bcod\b|треск/.test(normalized)) {
    return 'cod';
  }
  if (/\btuna\b|тон/.test(normalized)) {
    return 'tuna';
  }
  if (/\bapples?\b|ябълк/.test(normalized)) {
    return 'apple';
  }
  if (/\bbananas?\b|банан/.test(normalized)) {
    return 'banana';
  }
  if (/\boranges?\b|портокал/.test(normalized)) {
    return 'orange';
  }
  if (/\blemons?\b|лимон/.test(normalized)) {
    return 'lemon';
  }

  const canonical = INGREDIENT_ALIASES[normalized] || normalized;
  return canonical.replace(/\s+/g, '_');
}

function groupByCategory(ingredients) {
  const grouped = {};

  for (const [key, ingredient] of Object.entries(ingredients)) {
    const category = ingredient.category;
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push({
      key,
      ...ingredient,
    });
  }

  return grouped;
}

export function getBasketIngredients(basket) {
  const ingredients = [];
  for (const category in basket) {
    ingredients.push(...basket[category]);
  }
  return ingredients;
}

export function toggleIngredientChecked(ingredientKey) {
  const checked = getCheckedItems();
  checked[ingredientKey] = !checked[ingredientKey];
  saveCheckedItems(checked);
  return checked[ingredientKey];
}

export function isIngredientChecked(ingredientKey) {
  const checked = getCheckedItems();
  return checked[ingredientKey] || false;
}

export function clearCheckedItems() {
  saveCheckedItems({});
}

export function getBasketStats(basket) {
  let totalItems = 0;
  let categories = 0;
  let checkedItems = 0;
  const checked = getCheckedItems();

  for (const category in basket) {
    categories += 1;
    for (const ingredient of basket[category]) {
      totalItems += 1;
      if (checked[ingredient.key]) {
        checkedItems += 1;
      }
    }
  }

  return {
    totalItems,
    categories,
    checkedItems,
    percentComplete: totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0,
  };
}

export function exportBasketAsText(basket, _lang = 'en') {
  let text = `Shopping List\n${'='.repeat(40)}\n\n`;

  for (const category in basket) {
    text += `${category}\n${'-'.repeat(category.length)}\n`;
    for (const ingredient of basket[category]) {
      const measureStr = ingredient.displayMeasure || (ingredient.measures?.length > 0 ? ingredient.measures.join(', ') : '');
      const countStr = ingredient.count > 1 ? ` ×${ingredient.count}` : '';
      text += `☐ ${ingredient.name}${countStr}${measureStr ? ` (${measureStr})` : ''}\n`;
    }
    text += '\n';
  }

  return text;
}

export function importBasket(text) {
  // Parse text format back to basket object
  const lines = text.split('\n');
  const basket = {};
  let currentCategory = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    // Check if it's a category (contains dashes or ends with colon)
    if (trimmed.match(/^[A-Z].*[A-Z]$/)) {
      currentCategory = trimmed;
      if (!basket[currentCategory]) {
        basket[currentCategory] = [];
      }
    } else if (currentCategory && trimmed.startsWith('☐')) {
      const ingredientText = trimmed.replace('☐', '').trim();
      const [name, measures] = ingredientText.split('(');
      basket[currentCategory].push({
        key: normalizeIngredientKey(name),
        name: name.trim(),
        category: currentCategory,
        measures: measures ? [measures.replace(')', '').trim()] : [],
        count: 1,
      });
    }
  }

  return basket;
}
