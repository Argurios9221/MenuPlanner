// Advanced recipe search and filtering
import {
  searchMealsByName,
  fetchMealsByCategory,
  fetchMealDetails,
  extractIngredients,
  getRandomMeal,
} from './api.js';
import { getRecipeMetadata, detectAllergens } from './metadata.js';
import {
  isSpoonacularEnabled,
  searchSpoonacularRecipes,
  mapDietaryToSpoonacular,
} from './spoonacular.js';

const SEARCH_FALLBACK_CATEGORIES = [
  'Breakfast',
  'Chicken',
  'Beef',
  'Seafood',
  'Pasta',
  'Vegetarian',
  'Vegan',
  'Dessert',
  'Side',
  'Starter',
  'Pork',
  'Lamb',
  'Miscellaneous',
];

// Search recipes with multiple criteria
export async function advancedSearch(query, options = {}) {
  const {
    category = null,
    maxPrepTime = null,
    excludeAllergens = [],
    dietRestriction = '',
    difficulty = '',
    dietary = [],
    cuisine = '',
  } = options;

  try {
    let results = [];

    // Spoonacular search (runs in parallel with TheMealDB when key is set)
    const spoonPromise = isSpoonacularEnabled() && (query || category || cuisine)
      ? (() => {
        const { diet, intolerances } = mapDietaryToSpoonacular(dietary);
        return searchSpoonacularRecipes({
          query: query || '',
          cuisine: cuisine || '',
          diet,
          intolerances,
          maxReadyTime: maxPrepTime || undefined,
          number: 30,
        }).catch(() => []);
      })()
      : Promise.resolve([]);

    if (query && query.trim().length >= 1) {
      const [mealDbResults, spoonResults] = await Promise.all([
        searchMealsByName(query),
        spoonPromise,
      ]);
      results = [...mealDbResults, ...spoonResults];
    } else if (category) {
      const [catResults, spoonResults] = await Promise.all([
        fetchMealsByCategory(category),
        spoonPromise,
      ]);
      results = [...catResults, ...spoonResults];
    } else {
      const [categoryResults, randomResults, spoonResults] = await Promise.all([
        Promise.all(
          SEARCH_FALLBACK_CATEGORIES.map((item) => fetchMealsByCategory(item).catch(() => []))
        ).then((arrays) => arrays.flat()),
        Promise.all(
          Array.from({ length: 12 }, () => getRandomMeal().catch(() => null))
        ).then((meals) => meals.filter(Boolean)),
        spoonPromise,
      ]);
      results = [...categoryResults, ...randomResults, ...spoonResults];
    }

    const uniqueResults = Array.from(new Map(results.map((meal) => [meal.idMeal, meal])).values()).slice(0, 90);

    const enriched = await Promise.all(
      uniqueResults.map(async (meal) => {
        try {
          const details = await fetchMealDetails(meal.idMeal);
          const ingredients = extractIngredients(details);
          const metadata = getRecipeMetadata(details);
          return {
            ...meal,
            ...details,
            ingredients,
            metadata,
            allergens: detectAllergens(ingredients),
            prepTime: metadata.prepTime,
            difficulty: metadata.difficulty,
            difficultyScore:
              metadata.difficulty === 'Easy' ? 30 : metadata.difficulty === 'Hard' ? 80 : 55,
            searchScore: calculateSearchScore(meal.strMeal, query),
          };
        } catch {
          return {
            ...meal,
            searchScore: calculateSearchScore(meal.strMeal, query),
          };
        }
      })
    );

    let filtered = applySearchFilters(enriched, {
      difficulty,
      maxPrepTime,
      excludeAllergens,
      dietRestriction,
    });

    if (filtered.length === 0 && difficulty) {
      filtered = applySearchFilters(enriched, {
        maxPrepTime,
        excludeAllergens,
        dietRestriction,
      });
    }

    if (filtered.length === 0 && maxPrepTime) {
      filtered = applySearchFilters(enriched, {
        excludeAllergens,
        dietRestriction,
      });
    }

    if (filtered.length === 0 && excludeAllergens.length > 0) {
      filtered = applySearchFilters(enriched, {
        dietRestriction,
      });
    }

    if (filtered.length === 0) {
      filtered = enriched;
    }

    return filtered.sort((a, b) => {
      if (query) {
        return b.searchScore - a.searchScore;
      }
      return (a.strMeal || '').localeCompare(b.strMeal || '');
    });
  } catch (error) {
    console.error('Search failed:', error);
    return [];
  }
}

function applySearchFilters(
  recipes,
  { difficulty = '', maxPrepTime = null, excludeAllergens = [], dietRestriction = '' } = {}
) {
  let filtered = [...recipes];

  if (difficulty) {
    filtered = filtered.filter((meal) => {
      const mealDifficulty = (meal.difficulty || '').toLowerCase();
      if (difficulty.toLowerCase() === 'easy') {
        return mealDifficulty === 'easy' || (meal.difficultyScore || 50) <= 45;
      }
      if (difficulty.toLowerCase() === 'medium') {
        return mealDifficulty === 'medium' || ((meal.difficultyScore || 50) > 45 && (meal.difficultyScore || 50) <= 75);
      }
      if (difficulty.toLowerCase() === 'hard') {
        return mealDifficulty === 'hard' || (meal.difficultyScore || 50) > 75;
      }
      return true;
    });
  }

  if (maxPrepTime) {
    filtered = filterByPrepTime(filtered, maxPrepTime);
  }

  if (excludeAllergens.length > 0) {
    filtered = filterByAllergens(filtered, excludeAllergens);
  }

  if (dietRestriction) {
    filtered = filterByDiet(filtered, dietRestriction);
  }

  return filtered;
}

// Calculate search relevance score
function calculateSearchScore(mealName, query) {
  if (!query) {
    return 0;
  }

  const q = query.toLowerCase();
  const name = mealName.toLowerCase();

  // Exact match
  if (name === q) {
    return 100;
  }

  // Starts with query
  if (name.startsWith(q)) {
    return 80;
  }

  // Contains query
  if (name.includes(q)) {
    return 60;
  }

  // Word match
  const words = name.split(' ');
  if (words.some((w) => w.startsWith(q))) {
    return 40;
  }

  // Partial match
  let score = 0;
  for (let i = 0; i < Math.min(q.length, name.length); i++) {
    if (q[i] === name[i]) {
      score += 10;
    }
  }

  return Math.min(score, 30);
}

// Filter recipes by allergens
export function filterByAllergens(recipes, excludeAllergens = []) {
  if (!excludeAllergens || excludeAllergens.length === 0) {
    return recipes;
  }

  return recipes.filter((recipe) => {
    const allergens = recipe.allergens || [];
    return !allergens.some((allergen) =>
      excludeAllergens.some((excluded) => allergen.toLowerCase().includes(excluded.toLowerCase()))
    );
  });
}

// Filter by preparation time
export function filterByPrepTime(recipes, maxTime) {
  if (!maxTime) {
    return recipes;
  }

  return recipes.filter((recipe) => {
    const prepTime = recipe.prepTime || 30;
    return prepTime <= maxTime;
  });
}

// Filter by difficulty level
export function filterByDifficulty(recipes, minLevel, maxLevel) {
  const difficultyMap = {
    Easy: 30,
    Medium: 60,
    Hard: 80,
  };

  const minScore = difficultyMap[minLevel] || 0;
  const maxScore = difficultyMap[maxLevel] || 100;

  return recipes.filter((recipe) => {
    const score = recipe.difficultyScore || 50;
    return score >= minScore && score <= maxScore;
  });
}

// Filter by dietary restrictions
export function filterByDiet(recipes, diet) {
  if (!diet) {
    return recipes;
  }

  const dietFilters = {
    vegetarian: (recipe) => matchesDiet(recipe, 'vegetarian'),
    vegan: (recipe) => matchesDiet(recipe, 'vegan'),
    gluten_free: (recipe) => matchesDiet(recipe, 'gluten_free'),
    dairy_free: (recipe) => matchesDiet(recipe, 'dairy_free'),
  };

  const filterFn = dietFilters[diet.toLowerCase()];
  if (!filterFn) {
    return recipes;
  }

  return recipes.filter(filterFn);
}

function matchesDiet(recipe, diet) {
  const ingredients = recipe.ingredients || [];
  const haystack = [
    recipe.strMeal,
    recipe.strCategory,
    recipe.strArea,
    ...(ingredients.map((ingredient) => ingredient.name)),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const containsAny = (pattern) => pattern.test(haystack);

  const animalProteinPattern =
    /chicken|beef|pork|lamb|goat|turkey|duck|bacon|ham|sausage|mince|minced|meat|fish|seafood|salmon|tuna|cod|anchovy|shrimp|prawn|crab|lobster|oyster|mussel|clam|gelatin/;
  const dairyEggPattern =
    /milk|cream|butter|cheese|yogurt|yoghurt|egg|eggs|mayonnaise|mayo|custard|honey/;
  const glutenPattern = /wheat|flour|pasta|bread|noodle|breadcrumbs|barley|rye|semolina|couscous/;
  const dairyPattern = /milk|cream|butter|cheese|yogurt|yoghurt|custard|ghee/;

  switch (diet.toLowerCase()) {
    case 'vegetarian':
      return !containsAny(animalProteinPattern);
    case 'vegan':
      return !containsAny(animalProteinPattern) && !containsAny(dairyEggPattern);
    case 'gluten_free':
      return !containsAny(glutenPattern) && !recipe.allergens?.includes('gluten');
    case 'dairy_free':
      return !containsAny(dairyPattern) && !recipe.allergens?.includes('dairy');
    default:
      return true;
  }
}

// Sort recipes by various criteria
export function sortRecipes(recipes, sortBy = 'relevance', ascending = true) {
  const compareFn = (a, b) => {
    let aVal, bVal;

    switch (sortBy) {
      case 'difficulty':
        aVal = a.difficultyScore || 50;
        bVal = b.difficultyScore || 50;
        break;
      case 'prepTime':
        aVal = a.prepTime || 30;
        bVal = b.prepTime || 30;
        break;
      case 'calories':
        aVal = a.nutrition?.estimatedCalories || 300;
        bVal = b.nutrition?.estimatedCalories || 300;
        break;
      case 'name':
        aVal = (a.strMeal || '').toLowerCase();
        bVal = (b.strMeal || '').toLowerCase();
        return ascending ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      default:
        aVal = a.searchScore || 0;
        bVal = b.searchScore || 0;
    }

    return ascending ? aVal - bVal : bVal - aVal;
  };

  return [...recipes].sort(compareFn);
}

// Get trending recipes (placeholder - would use analytics)
export async function getTrendingRecipes(limit = 10) {
  try {
    // This would connect to a real analytics/database
    // For now, return popular categories
    const categories = ['Breakfast', 'Seafood', 'Pasta', 'Dessert'];
    const recipes = [];

    for (const category of categories.slice(0, Math.ceil(limit / 4))) {
      const items = await fetchMealsByCategory(category);
      recipes.push(...(items || []).slice(0, Math.ceil(limit / categories.length)));
    }

    return recipes.slice(0, limit);
  } catch (error) {
    console.error('Failed to fetch trending:', error);
    return [];
  }
}

// Get recipe recommendations based on favorites
export function getRecommendations(favoriteRecipes, allRecipes, limit = 5) {
  if (!favoriteRecipes || favoriteRecipes.length === 0) {
    return allRecipes.slice(0, limit);
  }

  // Score recipes based on similarity to favorites
  const scores = new Map();

  for (const recipe of allRecipes) {
    let score = 0;

    for (const fav of favoriteRecipes) {
      // Similar category
      if (recipe.strCategory === fav.strCategory) {
        score += 20;
      }

      // Similar area/cuisine
      if (recipe.strArea === fav.strArea) {
        score += 15;
      }

      // Similar difficulty
      if (Math.abs((recipe.difficultyScore || 50) - (fav.difficultyScore || 50)) < 20) {
        score += 10;
      }

      // Similar prep time
      if (Math.abs((recipe.prepTime || 30) - (fav.prepTime || 30)) < 15) {
        score += 10;
      }
    }

    if (score > 0) {
      scores.set(recipe.idMeal, score);
    }
  }

  // Return top scored recipes
  return allRecipes
    .filter((r) => scores.has(r.idMeal))
    .sort((a, b) => scores.get(b.idMeal) - scores.get(a.idMeal))
    .slice(0, limit);
}

// Advanced multi-criteria search
export async function multiCriteriaSearch(criteria = {}) {
  const {
    query = '',
    category = null,
    minDifficulty = 'Easy',
    maxDifficulty = 'Hard',
    maxPrepTime = 120,
    excludeAllergens = [],
    dietRestriction = null,
    sortBy = 'relevance',
    limit = 20,
  } = criteria;

  try {
    // Get base results
    let results = await advancedSearch(query, { category });

    // Apply filters
    results = filterByDifficulty(results, minDifficulty, maxDifficulty);
    results = filterByPrepTime(results, maxPrepTime);
    results = filterByAllergens(results, excludeAllergens);
    results = filterByDiet(results, dietRestriction);

    // Sort
    results = sortRecipes(results, sortBy);

    return results.slice(0, limit);
  } catch (error) {
    console.error('Multi-criteria search failed:', error);
    return [];
  }
}

// Export recipe for sharing with metadata
export function exportRecipeWithMetadata(recipe) {
  return {
    name: recipe.strMeal,
    category: recipe.strCategory,
    area: recipe.strArea,
    difficulty: recipe.difficulty,
    prepTime: recipe.prepTime,
    servings: recipe.servings,
    ingredients: recipe.ingredients,
    instructions: recipe.strInstructions,
    nutrition: recipe.nutrition,
    allergens: recipe.nutrition?.allergens || [],
  };
}
