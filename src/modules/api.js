// TheMealDB API operations
import { getLocalRecipes } from '../data/local-recipes.js';
import { themealdbSnapshot } from '../data/themealdb-cache.js';
import {
  fetchSpoonacularByCategory,
  fetchSpoonacularDetails,
  isSpoonacularEnabled,
} from './spoonacular.js';

const DUMMYJSON_API = 'https://dummyjson.com/recipes';
const SAMPLE_RECIPES_API = 'https://api.sampleapis.com/recipes/recipes';
const ENABLE_DUMMYJSON_SOURCE = false;
const localRecipeCollections = getLocalRecipes();
let extraRandomPool = [];
let extraRandomIndex = 0;
const themealdbMeals = Array.isArray(themealdbSnapshot?.meals) ? themealdbSnapshot.meals : [];
const themealdbMealMap = new Map(themealdbMeals.map((meal) => [String(meal.idMeal), meal]));

// Cache responses to limit API calls
const apiCache = new Map();
const CACHE_DURATION = 1 * 60 * 60 * 1000; // 1 hour

function getCacheKey(category) {
  return `meals_${category}`;
}

function toTitleCase(value) {
  const text = String(value || '').trim();
  if (!text) {
    return text;
  }
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function normalizeIngredient(value) {
  if (!value) {
    return null;
  }
  if (typeof value === 'string') {
    return { name: value.trim(), measure: '' };
  }
  if (typeof value === 'object') {
    const name = value.name || value.ingredient || value.item || '';
    const measure = value.measure || value.quantity || value.amount || '';
    if (!String(name).trim()) {
      return null;
    }
    return { name: String(name).trim(), measure: String(measure || '').trim() };
  }
  return null;
}

function normalizeDummyRecipe(recipe) {
  const mealType = Array.isArray(recipe.mealType) ? recipe.mealType[0] : recipe.mealType;
  const tags = Array.isArray(recipe.tags) ? recipe.tags.join(',') : '';
  const ingredients = Array.isArray(recipe.ingredients)
    ? recipe.ingredients.map(normalizeIngredient).filter(Boolean)
    : [];

  return {
    idMeal: `dummy_${recipe.id}`,
    strMeal: recipe.name || 'Untitled recipe',
    strCategory: toTitleCase(mealType || recipe.course || 'Main'),
    strArea: toTitleCase(recipe.cuisine || 'International'),
    strInstructions: Array.isArray(recipe.instructions)
      ? recipe.instructions.join('\n')
      : recipe.instructions || '',
    strMealThumb: recipe.image || '',
    strTags: tags,
    ingredients,
    _source: 'dummyjson',
    _rawId: recipe.id,
  };
}

function normalizeSampleRecipe(recipe, fallbackId) {
  const title =
    recipe.title ||
    recipe.name ||
    recipe.recipeName ||
    recipe.strMeal ||
    recipe.dish ||
    `Sample Recipe ${fallbackId}`;

  const category =
    recipe.category ||
    recipe.course ||
    recipe.mealType ||
    recipe.type ||
    recipe.strCategory ||
    'Main';

  const area = recipe.cuisine || recipe.strArea || recipe.origin || 'International';
  const tags = Array.isArray(recipe.tags)
    ? recipe.tags.join(',')
    : recipe.tags || recipe.keywords || '';

  const instructions = Array.isArray(recipe.instructions)
    ? recipe.instructions.join('\n')
    : recipe.instructions || recipe.directions || recipe.method || recipe.description || '';

  const ingredientList =
    recipe.ingredients || recipe.ingredientLines || recipe.ingredient || recipe.recipeIngredient || [];
  const ingredients = Array.isArray(ingredientList)
    ? ingredientList.map(normalizeIngredient).filter(Boolean)
    : [];

  return {
    idMeal: `sample_${recipe.id || fallbackId}`,
    strMeal: String(title),
    strCategory: toTitleCase(String(category)),
    strArea: toTitleCase(String(area)),
    strInstructions: String(instructions || ''),
    strMealThumb: recipe.photoUrl || recipe.image || recipe.imageUrl || '',
    strTags: String(tags || ''),
    ingredients,
    _source: 'sampleapis',
    _rawId: recipe.id || fallbackId,
  };
}

function normalizeLocalRecipe(recipe, sourceKey, fallbackId) {
  const ingredients = Array.isArray(recipe.ingredients)
    ? recipe.ingredients.map(normalizeIngredient).filter(Boolean)
    : [];

  return {
    idMeal: `local_${sourceKey}_${recipe.id || fallbackId}`,
    strMeal: recipe.name || `Local Recipe ${fallbackId}`,
    strCategory: toTitleCase(recipe.category || 'Main'),
    strArea: toTitleCase(recipe.cuisine || 'International'),
    strInstructions: Array.isArray(recipe.instructions)
      ? recipe.instructions.join('\n')
      : recipe.instructions || '',
    strMealThumb: recipe.image || '',
    strTags: Array.isArray(recipe.tags) ? recipe.tags.join(',') : recipe.tags || '',
    ingredients,
    _source: `local_${sourceKey}`,
    _rawId: recipe.id || fallbackId,
  };
}

function categoryKeywords(category) {
  const map = {
    Breakfast: ['breakfast', 'pancake', 'omelette', 'oat', 'toast', 'waffle', 'cereal', 'brunch'],
    Beef: ['beef', 'steak'],
    Chicken: ['chicken', 'poultry'],
    Goat: ['goat'],
    Lamb: ['lamb'],
    Pasta: ['pasta', 'spaghetti', 'penne', 'macaroni', 'lasagna'],
    Pork: ['pork', 'bacon', 'ham'],
    Seafood: ['seafood', 'fish', 'salmon', 'tuna', 'shrimp', 'prawn'],
    Vegan: ['vegan', 'plant-based'],
    Vegetarian: ['vegetarian', 'veggie'],
    Side: ['side'],
    Starter: ['starter', 'appetizer'],
    Dessert: ['dessert', 'cake', 'cookie', 'pie', 'pudding'],
  };
  return map[category] || [];
}

function matchesCategory(recipe, category) {
  if (!recipe) {
    return false;
  }
  const categoryLower = String(category || '').toLowerCase();
  const text = [recipe.strCategory, recipe.strMeal, recipe.strTags, recipe.strArea]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (text.includes(categoryLower)) {
    return true;
  }

  return categoryKeywords(category).some((keyword) => text.includes(keyword));
}

function getCachedMealDbCategoryMeals(category) {
  return themealdbMeals
    .filter((meal) => String(meal?.strCategory || '').toLowerCase() === String(category || '').toLowerCase())
    .map((meal) => ({
      idMeal: meal.idMeal,
      strMeal: meal.strMeal,
      strMealThumb: meal.strMealThumb,
    }));
}

function getCachedMealDbMealDetails(mealId) {
  return themealdbMealMap.get(String(mealId)) || null;
}

function searchCachedMealDbMeals(query) {
  const needle = String(query || '').trim().toLowerCase();
  if (!needle) {
    return [];
  }

  return themealdbMeals.filter((meal) => {
    const haystack = [meal?.strMeal, meal?.strCategory, meal?.strArea, meal?.strTags]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(needle);
  });
}

function getCachedMealDbMealsByArea(area) {
  const normalizedArea = String(area || '').trim().toLowerCase();
  return themealdbMeals.filter((meal) => String(meal?.strArea || '').trim().toLowerCase() === normalizedArea);
}

async function fetchDummyRecipes() {
  if (!ENABLE_DUMMYJSON_SOURCE) {
    return [];
  }

  const cacheKey = 'source_dummyjson_all';
  if (isValidCache(cacheKey)) {
    return apiCache.get(cacheKey).data;
  }

  try {
    const response = await fetch(`${DUMMYJSON_API}?limit=100`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    const recipes = Array.isArray(data.recipes) ? data.recipes.map(normalizeDummyRecipe) : [];
    apiCache.set(cacheKey, { data: recipes, timestamp: Date.now() });
    return recipes;
  } catch (error) {
    console.warn('Failed to fetch DummyJSON recipes:', error);
    return [];
  }
}

async function fetchSampleRecipes() {
  const cacheKey = 'source_sampleapis_all';
  if (isValidCache(cacheKey)) {
    return apiCache.get(cacheKey).data;
  }

  try {
    const response = await fetch(SAMPLE_RECIPES_API);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    const rows = Array.isArray(data) ? data : [];
    const recipes = rows.map((item, index) => normalizeSampleRecipe(item, index + 1));
    apiCache.set(cacheKey, { data: recipes, timestamp: Date.now() });
    return recipes;
  } catch (error) {
    console.warn('Failed to fetch SampleAPIs recipes:', error);
    return [];
  }
}

async function fetchLocalRecipes() {
  const cacheKey = 'source_local_all';
  if (isValidCache(cacheKey)) {
    return apiCache.get(cacheKey).data;
  }

  const recipes = Object.entries(localRecipeCollections).flatMap(([sourceKey, rows]) =>
    rows.map((item, index) => normalizeLocalRecipe(item, sourceKey, index + 1))
  );

  apiCache.set(cacheKey, { data: recipes, timestamp: Date.now() });
  return recipes;
}

function dedupeByMealId(meals) {
  const map = new Map();
  for (const meal of meals) {
    if (meal?.idMeal && !map.has(meal.idMeal)) {
      map.set(meal.idMeal, meal);
    }
  }
  return Array.from(map.values());
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function isValidCache(key) {
  if (!apiCache.has(key)) {
    return false;
  }
  const { timestamp } = apiCache.get(key);
  return Date.now() - timestamp < CACHE_DURATION;
}

export async function fetchMealsByCategory(category) {
  const cacheKey = getCacheKey(category);
  if (isValidCache(cacheKey)) {
    return apiCache.get(cacheKey).data;
  }

  try {
    const mealDbPromise = Promise.resolve(getCachedMealDbCategoryMeals(category));

    const spoonPromise = isSpoonacularEnabled()
      ? fetchSpoonacularByCategory(category).catch(() => [])
      : Promise.resolve([]);

    const [mealDbMeals, dummyRecipes, sampleRecipes, localRecipes, spoonRecipes] = await Promise.all([
      mealDbPromise,
      fetchDummyRecipes(),
      fetchSampleRecipes(),
      fetchLocalRecipes(),
      spoonPromise,
    ]);

    const merged = dedupeByMealId([
      ...mealDbMeals,
      ...dummyRecipes.filter((recipe) => matchesCategory(recipe, category)),
      ...sampleRecipes.filter((recipe) => matchesCategory(recipe, category)),
      ...localRecipes.filter((recipe) => matchesCategory(recipe, category)),
      ...spoonRecipes,
    ]);

    if (merged.length === 0) {
      throw new Error('No meals found');
    }

    apiCache.set(cacheKey, { data: merged, timestamp: Date.now() });
    return merged;
  } catch (error) {
    console.error(`Failed to fetch meals for category "${category}":`, error);
    throw error;
  }
}

export async function fetchMealDetails(mealId) {
  if (String(mealId).startsWith('spoon_')) {
    return fetchSpoonacularDetails(mealId);
  }

  if (String(mealId).startsWith('dummy_')) {
    if (!ENABLE_DUMMYJSON_SOURCE) {
      throw new Error('Meal not found');
    }
    const list = await fetchDummyRecipes();
    const found = list.find((item) => item.idMeal === mealId);
    if (!found) {
      throw new Error('Meal not found');
    }
    return found;
  }

  if (String(mealId).startsWith('sample_')) {
    const list = await fetchSampleRecipes();
    const found = list.find((item) => item.idMeal === mealId);
    if (!found) {
      throw new Error('Meal not found');
    }
    return found;
  }

  if (String(mealId).startsWith('local_')) {
    const list = await fetchLocalRecipes();
    const found = list.find((item) => item.idMeal === mealId);
    if (!found) {
      throw new Error('Meal not found');
    }
    return found;
  }

  const cachedMeal = getCachedMealDbMealDetails(mealId);
  if (cachedMeal) {
    return cachedMeal;
  }

  throw new Error('Meal not found');
}

export async function searchMealsByName(query) {
  return searchCachedMealDbMeals(query);
}

export async function getMealsByArea(area) {
  return getCachedMealDbMealsByArea(area);
}

export async function getRandomMeal() {
  try {
    const useExtraSource = Math.random() < 0.85;

    if (useExtraSource) {
      if (extraRandomIndex >= extraRandomPool.length) {
        const [dummyRecipes, sampleRecipes, localRecipes] = await Promise.all([
          fetchDummyRecipes(),
          fetchSampleRecipes(),
          fetchLocalRecipes(),
        ]);
        const combined = dedupeByMealId([...dummyRecipes, ...sampleRecipes, ...localRecipes]);
        extraRandomPool = shuffle(combined);
        extraRandomIndex = 0;
      }

      if (extraRandomPool.length > 0 && extraRandomIndex < extraRandomPool.length) {
        const picked = extraRandomPool[extraRandomIndex];
        extraRandomIndex += 1;
        return picked;
      }
    }

    if (themealdbMeals.length > 0) {
      const randomIndex = Math.floor(Math.random() * themealdbMeals.length);
      return themealdbMeals[randomIndex] || null;
    }

    return null;
  } catch (error) {
    console.error('Failed to fetch random meal:', error);
    throw error;
  }
}

export function clearCache() {
  apiCache.clear();
  extraRandomPool = [];
  extraRandomIndex = 0;
}

export function extractIngredients(mealDetails) {
  if (Array.isArray(mealDetails?.ingredients) && mealDetails.ingredients.length > 0) {
    return mealDetails.ingredients
      .map((ing) => normalizeIngredient(ing))
      .filter((ing) => ing && ing.name);
  }

  const ingredients = [];
  for (let i = 1; i <= 20; i++) {
    const ingredient = mealDetails[`strIngredient${i}`];
    const measure = mealDetails[`strMeasure${i}`];
    if (ingredient && ingredient.trim()) {
      ingredients.push({
        name: ingredient.trim(),
        measure: measure ? measure.trim() : '',
      });
    }
  }
  return ingredients;
}

export function categorizeIngredient(ingredientName) {
  const lower = ingredientName.toLowerCase();

  // Meat & Poultry
  if (/chicken|beef|pork|lamb|turkey|duck|veal|ham|bacon|sausage|minced/.test(lower)) {
    return 'Meat & Poultry';
  }

  // Fish & Seafood
  if (/fish|salmon|tuna|shrimp|prawn|crab|lobster|oyster|mussel|squid|clam/.test(lower)) {
    return 'Fish & Seafood';
  }

  // Dairy & Eggs
  if (/cheese|milk|cream|butter|yogurt|egg|ricotta|mozzarella|cheddar|parmesan/.test(lower)) {
    return 'Dairy & Eggs';
  }

  // Vegetables
  if (
    /lettuce|onion|garlic|potato|tomato|pepper|carrot|broccoli|spinach|bean|peas|corn|cucumber|zucchini|eggplant|celery|leek|asparagus|cabbage|mushroom/.test(
      lower
    )
  ) {
    return 'Vegetables';
  }

  // Fruits
  if (
    /apple|banana|orange|lemon|lime|strawberry|blueberry|grape|watermelon|melon|pineapple|mango|avocado|coconut/.test(
      lower
    )
  ) {
    return 'Fruits';
  }

  // Grains & Pasta
  if (/flour|bread|pasta|rice|noodle|wheat|oat|cereal|grain|couscous|bulgur/.test(lower)) {
    return 'Grains & Pasta';
  }

  // Spices & Herbs
  if (
    /salt|pepper|paprika|cumin|oregano|basil|thyme|rosemary|garlic|cinnamon|turmeric|chili|nutmeg|clove|ginger|coriander|mustard|soy|vinegar|sauce|oil|honey|sugar/.test(
      lower
    )
  ) {
    return 'Spices & Herbs';
  }

  // Default: Other
  return 'Other';
}
