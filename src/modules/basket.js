// Shopping basket management
import { categorizeIngredient, extractIngredients, fetchMealDetails } from './api.js';
import { getCheckedItems, saveCheckedItems } from './storage.js';

export async function buildBasket(menu) {
  const ingredients = {};

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
          const key = normalizeIngredientKey(ingredient.name);
          if (!ingredients[key]) {
            ingredients[key] = {
              name: ingredient.name,
              category: categorizeIngredient(ingredient.name),
              measures: [],
              count: 0,
            };
          }
          if (ingredient.measure) {
            ingredients[key].measures.push(ingredient.measure);
          }
          ingredients[key].count += 1;
        }
      }
    }
  }

  return groupByCategory(ingredients);
}

function normalizeIngredientKey(name) {
  return name.toLowerCase().replace(/\s+/g, '_');
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
      const measures = ingredient.measures.length > 0 ? ` (${ingredient.measures.join(', ')})` : '';
      text += `☐ ${ingredient.name}${measures}\n`;
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
