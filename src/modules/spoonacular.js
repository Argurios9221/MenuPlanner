// Spoonacular API integration
// Users supply their own free key from https://spoonacular.com/food-api
// Key is stored in localStorage (never baked into the build).

const BASE_URL = 'https://api.spoonacular.com';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour
const STORAGE_KEY = 'spoonacular_api_key';

const _cache = new Map();

// ---------- Key management ----------

export function getSpoonacularKey() {
  return (localStorage.getItem(STORAGE_KEY) || '').trim();
}

export function setSpoonacularKey(key) {
  const trimmed = String(key || '').trim();
  if (trimmed) {
    localStorage.setItem(STORAGE_KEY, trimmed);
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
  _cache.clear();
}

export function isSpoonacularEnabled() {
  return Boolean(getSpoonacularKey());
}

// ---------- Internal helpers ----------

function buildUrl(path, params = {}) {
  const key = getSpoonacularKey();
  if (!key) {
    throw new Error('Spoonacular API key is not set');
  }
  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set('apiKey', key);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

function isCacheValid(key) {
  if (!_cache.has(key)) {
    return false;
  }
  return Date.now() - _cache.get(key).ts < CACHE_DURATION;
}

function capitalize(str) {
  const s = String(str || '');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Strip HTML tags from Spoonacular summary text
function stripHtml(html) {
  return String(html || '').replace(/<[^>]+>/g, '');
}

// ---------- Normalization ----------

export function normalizeSpoonacularRecipe(raw) {
  if (!raw) {
    return null;
  }

  const nutrients = raw.nutrition?.nutrients || [];
  const find = (name) => Math.round(nutrients.find((n) => n.name === name)?.amount || 0);

  const nutrition = {
    calories: find('Calories'),
    protein: find('Protein'),
    carbs: find('Carbohydrates'),
    fat: find('Fat'),
    fiber: find('Fiber'),
  };

  const ingredients = (raw.extendedIngredients || []).map((ing) => ({
    name: String(ing.name || ing.nameClean || ing.originalName || '').trim(),
    measure: `${ing.amount || ''} ${ing.unit || ''}`.trim(),
  })).filter((ing) => ing.name);

  const dishTypes = raw.dishTypes || [];
  const diets = raw.diets || [];
  const cuisines = raw.cuisines || [];

  // Map Spoonacular dish type to a unified category name
  const categoryMap = {
    breakfast: 'Breakfast',
    'morning meal': 'Breakfast',
    dessert: 'Dessert',
    appetizer: 'Starter',
    starter: 'Starter',
    salad: 'Side',
    'side dish': 'Side',
    soup: 'Soup',
    'main course': 'Main',
    'main dish': 'Main',
    dinner: 'Main',
    lunch: 'Main',
    snack: 'Side',
    beverage: 'Side',
    drink: 'Side',
    sauce: 'Side',
    fingerfood: 'Starter',
  };

  const rawDishType = dishTypes[0]?.toLowerCase() || '';
  const strCategory = categoryMap[rawDishType] || capitalize(dishTypes[0] || 'Main');
  const strArea = capitalize(cuisines[0] || 'International');

  const instructions =
    raw.instructions ||
    raw.analyzedInstructions?.[0]?.steps?.map((s) => s.step).join('\n') ||
    stripHtml(raw.summary) ||
    '';

  return {
    idMeal: `spoon_${raw.id}`,
    strMeal: String(raw.title || 'Untitled'),
    strCategory,
    strArea,
    strInstructions: String(instructions),
    strMealThumb: raw.image || '',
    strYoutube: raw.sourceUrl || '',
    strTags: [...dishTypes, ...diets].join(','),
    ingredients,
    nutrition,
    readyInMinutes: raw.readyInMinutes || 0,
    servings: raw.servings || 4,
    sourceUrl: raw.sourceUrl || '',
    _source: 'spoonacular',
    _rawId: raw.id,
  };
}

// ---------- Map preferences to Spoonacular params ----------

/** Maps project cuisine string → Spoonacular cuisine query param */
function mapCuisine(cuisine) {
  const map = {
    Italian: 'Italian',
    Mexican: 'Mexican',
    Japanese: 'Japanese',
    Indian: 'Indian',
    Chinese: 'Chinese',
    Bulgarian: 'Eastern European',
    mix: '',
  };
  return map[cuisine] || '';
}

/** Maps dietary array → { diet, intolerances } Spoonacular params */
export function mapDietaryToSpoonacular(dietary = []) {
  let diet = '';
  const intolerances = [];

  for (const d of dietary) {
    switch (d) {
      case 'lactose_free':
        intolerances.push('dairy');
        break;
      case 'no_seafood':
        intolerances.push('seafood');
        break;
      case 'no_nuts':
        intolerances.push('tree nut', 'peanut');
        break;
      case 'gluten_free':
        diet = 'gluten free';
        break;
      case 'no_pork':
        intolerances.push('pork');
        break;
      default:
        break;
    }
  }

  return { diet, intolerances: [...new Set(intolerances)].join(',') };
}

/** Maps prep time preference → maxReadyTime (minutes) or undefined */
function mapPrepTime(prepTime) {
  switch (prepTime) {
    case 'quick':
      return 25;
    case 'medium':
      return 45;
    default:
      return undefined;
  }
}

/** Maps project dish type / category → Spoonacular `type` param */
function mapCategoryToType(category) {
  const map = {
    Breakfast: 'breakfast',
    Dessert: 'dessert',
    Starter: 'appetizer',
    Side: 'side dish',
    Pasta: 'main course',
    Beef: 'main course',
    Chicken: 'main course',
    Pork: 'main course',
    Lamb: 'main course',
    Goat: 'main course',
    Seafood: 'main course',
    Vegan: 'main course',
    Vegetarian: 'main course',
    Miscellaneous: 'main course',
  };
  return map[category] || 'main course';
}

// ---------- Public API ----------

/**
 * Search for recipes using Spoonacular's complexSearch endpoint.
 * Returns an array of normalized recipe objects.
 */
export async function searchSpoonacularRecipes({
  query = '',
  cuisine = '',
  diet = '',
  intolerances = '',
  maxReadyTime = undefined,
  number = 20,
} = {}) {
  if (!isSpoonacularEnabled()) {
    return [];
  }

  const cacheKey = `search:${query}:${cuisine}:${diet}:${intolerances}:${maxReadyTime}:${number}`;
  if (isCacheValid(cacheKey)) {
    return _cache.get(cacheKey).data;
  }

  const params = {
    query,
    cuisine,
    diet,
    intolerances,
    number,
    addRecipeNutrition: true,
    addRecipeInformation: true,
    fillIngredients: true,
  };
  if (maxReadyTime) {
    params.maxReadyTime = maxReadyTime;
  }

  try {
    const url = buildUrl('/recipes/complexSearch', params);
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Spoonacular search HTTP ${res.status}`);
    }
    const data = await res.json();
    const recipes = (data.results || []).map(normalizeSpoonacularRecipe).filter(Boolean);
    _cache.set(cacheKey, { data: recipes, ts: Date.now() });
    // Cache each recipe individually too
    for (const recipe of recipes) {
      const id = String(recipe._rawId || '');
      if (id) {
        _cache.set(`info:${id}`, { data: recipe, ts: Date.now() });
      }
    }
    return recipes;
  } catch (err) {
    console.warn('[Spoonacular] search failed:', err.message);
    return [];
  }
}

/**
 * Fetch Spoonacular recipes for a given category, honoring cuisine, dietary and prep-time prefs.
 * Used inside api.js fetchMealsByCategory() as an additional pool.
 */
export async function fetchSpoonacularByCategory(category, { cuisine = '', dietary = [], prepTime = 'any' } = {}) {
  if (!isSpoonacularEnabled()) {
    return [];
  }

  const cuisineParam = mapCuisine(cuisine);
  const { diet, intolerances } = mapDietaryToSpoonacular(dietary);
  const maxReadyTime = mapPrepTime(prepTime);
  const type = mapCategoryToType(category);

  const cacheKey = `cat:${category}:${cuisineParam}:${diet}:${intolerances}:${maxReadyTime}`;
  if (isCacheValid(cacheKey)) {
    return _cache.get(cacheKey).data;
  }

  const params = {
    type,
    cuisine: cuisineParam,
    diet,
    intolerances,
    number: 20,
    addRecipeNutrition: true,
    addRecipeInformation: true,
    fillIngredients: true,
  };
  if (maxReadyTime) {
    params.maxReadyTime = maxReadyTime;
  }

  try {
    const url = buildUrl('/recipes/complexSearch', params);
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Spoonacular category HTTP ${res.status}`);
    }
    const data = await res.json();
    const recipes = (data.results || []).map(normalizeSpoonacularRecipe).filter(Boolean);
    _cache.set(cacheKey, { data: recipes, ts: Date.now() });
    // Also cache each recipe individually so fetchSpoonacularDetails avoids re-fetching
    for (const recipe of recipes) {
      const id = String(recipe._rawId || '');
      if (id) {
        _cache.set(`info:${id}`, { data: recipe, ts: Date.now() });
      }
    }
    return recipes;
  } catch (err) {
    console.warn(`[Spoonacular] fetchByCategory(${category}) failed:`, err.message);
    return [];
  }
}

/**
 * Fetch full details for a single Spoonacular recipe by its spoon_ prefixed ID.
 */
export async function fetchSpoonacularDetails(spoonId) {
  const rawId = String(spoonId).replace('spoon_', '');
  const cacheKey = `info:${rawId}`;
  if (isCacheValid(cacheKey)) {
    return _cache.get(cacheKey).data;
  }

  try {
    const url = buildUrl(`/recipes/${rawId}/information`, { includeNutrition: true });
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Spoonacular info HTTP ${res.status}`);
    }
    const data = await res.json();
    const recipe = normalizeSpoonacularRecipe(data);
    _cache.set(cacheKey, { data: recipe, ts: Date.now() });
    return recipe;
  } catch (err) {
    console.warn(`[Spoonacular] fetchDetails(${spoonId}) failed:`, err.message);
    throw err;
  }
}

/**
 * Generate a Spoonacular weekly meal plan aligned with user preferences.
 * Returns raw Spoonacular meal plan data or null on failure.
 * Each day contains meals with id/title/readyInMinutes/servings + daily nutrients.
 */
export async function generateSpoonacularMealPlan(prefs = {}) {
  if (!isSpoonacularEnabled()) {
    return null;
  }

  const { dietary = [], allergies = [] } = prefs;
  const { diet } = mapDietaryToSpoonacular(dietary);

  const params = {
    timeFrame: 'week',
  };
  if (diet) {
    params.diet = diet;
  }
  const exclude = [...allergies.filter(Boolean)].join(',');
  if (exclude) {
    params.exclude = exclude;
  }

  const cacheKey = `mealplan:${JSON.stringify(params)}`;
  if (isCacheValid(cacheKey)) {
    return _cache.get(cacheKey).data;
  }

  try {
    const url = buildUrl('/mealplanner/generate', params);
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Spoonacular meal plan HTTP ${res.status}`);
    }
    const data = await res.json();
    _cache.set(cacheKey, { data, ts: Date.now() });
    return data;
  } catch (err) {
    console.warn('[Spoonacular] generateMealPlan failed:', err.message);
    return null;
  }
}

/**
 * Get suggested substitutes for a named ingredient.
 * Returns a string array like ["use 1 cup of X instead of 1 cup of Y"].
 */
export async function getIngredientSubstitutes(ingredientName) {
  if (!isSpoonacularEnabled() || !ingredientName) {
    return [];
  }

  const cacheKey = `sub:${String(ingredientName).toLowerCase()}`;
  if (isCacheValid(cacheKey)) {
    return _cache.get(cacheKey).data;
  }

  try {
    // First find the ingredient id
    const searchUrl = buildUrl('/food/ingredients/search', {
      query: ingredientName,
      number: 1,
    });
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) {
      return [];
    }
    const searchData = await searchRes.json();
    const ingredient = searchData.results?.[0];
    if (!ingredient?.id) {
      return [];
    }

    const subUrl = buildUrl(`/food/ingredients/${ingredient.id}/substitutes`);
    const subRes = await fetch(subUrl);
    if (!subRes.ok) {
      return [];
    }
    const subData = await subRes.json();
    const subs = subData.substitutes || [];
    _cache.set(cacheKey, { data: subs, ts: Date.now() });
    return subs;
  } catch (err) {
    console.warn('[Spoonacular] getSubstitutes failed:', err.message);
    return [];
  }
}

/**
 * Fetch nutrition details (full breakdown) for a Spoonacular recipe id.
 */
export async function getRecipeNutrition(spoonId) {
  const rawId = String(spoonId).replace('spoon_', '');
  const cacheKey = `nutr:${rawId}`;
  if (isCacheValid(cacheKey)) {
    return _cache.get(cacheKey).data;
  }

  try {
    const url = buildUrl(`/recipes/${rawId}/nutritionWidget.json`);
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Spoonacular nutrition HTTP ${res.status}`);
    }
    const data = await res.json();
    _cache.set(cacheKey, { data, ts: Date.now() });
    return data;
  } catch (err) {
    console.warn(`[Spoonacular] getNutrition(${spoonId}) failed:`, err.message);
    return null;
  }
}

export function clearSpoonacularCache() {
  _cache.clear();
}
