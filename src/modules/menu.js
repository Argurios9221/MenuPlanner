// Menu generation logic
import { extractIngredients, fetchMealDetails, fetchMealsByCategory, getRandomMeal } from './api.js';
import { saveCurrentMenu } from './storage.js';
import { estimateCalories, estimatePrepTime } from './metadata.js';
import { getWeatherHint, getWeatherMealCategory, getWeatherMealKeywords } from './weather.js';

const DAYS_OF_WEEK = 7;
const MEALS_PER_DAY = 3; // breakfast, lunch, dinner
const MEAL_SLOTS = ['Breakfast', 'Lunch', 'Dinner'];

const MAIN_MEAL_CATEGORIES = ['Beef', 'Chicken', 'Goat', 'Lamb', 'Pasta', 'Pork', 'Seafood', 'Vegan', 'Vegetarian'];
const MIN_EASY_INGREDIENT_RATIO = 0.7;
const MIX_ALLOWED_CUISINES = ['bulgarian', 'italian', 'german', 'british', 'french', 'mediterranean'];

// Extra dietary exclusions applied during current generation/swap
let _extraDietaryFilter = [];
let _generationContext = {
  weatherHint: null,
  goal: '',
  lastProteinBySlot: { Lunch: '', Dinner: '' },
};

const EASY_INGREDIENT_KEYWORDS = [
  'oat',
  'bean',
  'chickpea',
  'tofu',
  'cod',
  'tomato',
  'potato',
  'onion',
  'garlic',
  'carrot',
  'pepper',
  'cucumber',
  'spinach',
  'zucchini',
  'mushroom',
  'broccoli',
  'strawberry',
  'rice',
  'pasta',
  'bread',
  'bun',
  'egg',
  'milk',
  'yogurt',
  'cheese',
  'butter',
  'chicken',
  'beef',
  'pork',
  'lamb',
  'salmon',
  'tuna',
  'apple',
  'banana',
  'orange',
  'lemon',
  'flour',
  'oil',
  'sugar',
];

const HARD_TO_FIND_INGREDIENT_PATTERN =
  /truffle|saffron|caviar|foie|venison|pheasant|rabbit|escargot|octopus|eel|langoustine|wasabi root|kombu|galangal|lemongrass paste|sumac|tamarind paste|yuzu|quinoa flakes|buckwheat flour/;

const PANTRY_IGNORED_PATTERN =
  /salt|pepper|water|olive oil|vegetable oil|vinegar|spice|seasoning|herb|bay leaf|paprika|cinnamon|nutmeg|sauce|soy sauce|mustard|ketchup|mayo|mayonnaise|baking powder|baking soda|yeast/;

function normalizeText(value) {
  return String(value || '').toLowerCase().trim();
}

function mealSignature(meal) {
  return normalizeText(meal?.strMeal)
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function isEasyIngredient(name) {
  const text = normalizeText(name);
  if (!text) {
    return false;
  }
  return EASY_INGREDIENT_KEYWORDS.some((keyword) => text.includes(keyword));
}

function isEasyToShopMeal(meal, minRatio = MIN_EASY_INGREDIENT_RATIO) {
  const ingredients = (meal.ingredients || [])
    .map((item) => item?.name)
    .filter(Boolean)
    .map((name) => String(name).trim())
    .filter((name) => !PANTRY_IGNORED_PATTERN.test(name.toLowerCase()));

  if (ingredients.length === 0) {
    return true;
  }

  if (ingredients.some((name) => HARD_TO_FIND_INGREDIENT_PATTERN.test(name.toLowerCase()))) {
    return false;
  }

  const easyCount = ingredients.filter((name) => isEasyIngredient(name)).length;
  const ratio = easyCount / ingredients.length;
  return ratio >= minRatio;
}

function hasRequiredIngredients(meal) {
  const ingredients = (meal?.ingredients || [])
    .map((item) => item?.name)
    .filter((name) => String(name || '').trim().length > 0);
  return ingredients.length > 0;
}

function matchesDietaryExclusions(meal) {
  if (!_extraDietaryFilter.length) {
    return true;
  }
  const exclusionPatterns = {
    no_pork: /\bpork|bacon|ham|pancetta|prosciutto|lard\b/i,
    no_beef: /\bbeef|veal|mince\b/i,
    lactose_free: /\bmilk|cream|butter|cheese|yogurt|yoghurt|custard\b/i,
    no_chicken: /\bchicken|hen|rooster|chicken stock\b/i,
    no_seafood: /\bfish|seafood|salmon|tuna|cod|anchovy|shrimp|prawn|crab|lobster|oyster|mussel|clam\b/i,
    no_nuts: /\bnut|peanut|almond|hazelnut|walnut|cashew|pistachio|pecan|sesame|tahini\b/i,
    gluten_free: /\bwheat|flour|pasta|bread|noodle|breadcrumbs|barley|rye|semolina|couscous\b/i,
  };
  const haystack = [
    meal.strMeal,
    meal.strCategory,
    ...(meal.ingredients || []).map((ing) => ing.name || ''),
  ]
    .filter(Boolean)
    .join(' ');
  return _extraDietaryFilter.every((exclusion) => {
    const pattern = exclusionPatterns[exclusion];
    return !pattern || !pattern.test(haystack);
  });
}

function matchesMealSlot(meal, slotType) {
  const category = String(meal?.strCategory || '').toLowerCase();
  const text = [meal?.strMeal, meal?.strCategory, meal?.strTags]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const breakfastKeywords = /breakfast|pancake|omelette|omelet|toast|porridge|oat|muesli|granola|cereal|crepe|waffle|smoothie|muffin/;
  const savoryMealKeywords = /soup|stew|roast|curry|burger|steak|pasta|risotto|grill|bake|fried rice/;
  const dessertKeywords = /dessert|cake|pie|cookie|brownie|ice cream|pudding|tart/;

  if (slotType === 'Breakfast') {
    if (category === 'breakfast') {
      return true;
    }
    if (dessertKeywords.test(text) || savoryMealKeywords.test(text) || category === 'starter' || category === 'side') {
      return false;
    }
    return breakfastKeywords.test(text);
  }

  if (slotType === 'Lunch' || slotType === 'Dinner') {
    if (category === 'breakfast' || category === 'dessert') {
      return false;
    }
    if (breakfastKeywords.test(text) || dessertKeywords.test(text)) {
      return false;
    }
    return true;
  }

  return true;
}

function getMealPrimaryProtein(meal) {
  const haystack = [
    meal?.strMeal,
    meal?.strCategory,
    ...(meal?.ingredients || []).map((ing) => ing?.name || ''),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (/\bbeef\b|телешк/.test(haystack)) {
    return 'beef';
  }
  if (/\bpork\b|свинск/.test(haystack)) {
    return 'pork';
  }
  if (/\bchicken\b|пилешк|пиле/.test(haystack)) {
    return 'chicken';
  }
  if (/\blamb\b|агнешк/.test(haystack)) {
    return 'lamb';
  }
  if (/\bseafood\b|\bfish\b|\bsalmon\b|\btuna\b|\bcod\b|\bshrimp\b|\bprawn\b|\bcrab\b|сьомг|треск|риба/.test(haystack)) {
    return 'seafood';
  }
  if (/\bbean\b|\blentil\b|\bchickpea\b|\btofu\b|боб|леща|нахут|тофу/.test(haystack)) {
    return 'plant';
  }

  return '';
}

function matchesWeatherPreference(meal, slotType) {
  if (slotType === 'Breakfast') {
    return true;
  }

  const weatherHint = _generationContext.weatherHint;
  if (!weatherHint) {
    return true;
  }

  const text = [meal?.strMeal, meal?.strCategory, meal?.strTags]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const warmKeywords = /soup|stew|roast|curry|bake|risotto|broth|яхни|суп/;
  const lightKeywords = /salad|grill|grilled|fresh|wrap|sandwich|tabbouleh|салат/;

  if (weatherHint.isCold || weatherHint.isRainy) {
    return warmKeywords.test(text) || !lightKeywords.test(text);
  }

  if (weatherHint.isHot) {
    return lightKeywords.test(text) || !warmKeywords.test(text);
  }

  return true;
}

function matchesProteinRotation(meal, slotType, allowProteinRepeat = false) {
  if (allowProteinRepeat || (slotType !== 'Lunch' && slotType !== 'Dinner')) {
    return true;
  }

  const currentProtein = getMealPrimaryProtein(meal);
  if (!currentProtein) {
    return true;
  }

  return _generationContext.lastProteinBySlot[slotType] !== currentProtein;
}

function updateProteinRotation(meal, slotType) {
  if (slotType !== 'Lunch' && slotType !== 'Dinner') {
    return;
  }
  _generationContext.lastProteinBySlot[slotType] = getMealPrimaryProtein(meal);
}

function matchesGenerationContext(meal, slotType, allowProteinRepeat = false) {
  return (
    matchesWeatherPreference(meal, slotType) &&
    matchesProteinRotation(meal, slotType, allowProteinRepeat) &&
    matchesGoalPreference(meal, _generationContext.goal)
  );
}

function matchesGoalPreference(meal, goal) {
  if (!goal) {
    return true;
  }

  const ingredients = meal?.ingredients || [];
  const text = [meal?.strMeal, meal?.strCategory, ...(ingredients.map((ing) => ing?.name || ''))]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (goal === 'high_protein') {
    return /chicken|beef|pork|lamb|fish|salmon|tuna|egg|yogurt|cheese|bean|lentil|chickpea|tofu/.test(text);
  }

  if (goal === 'low_calorie') {
    const kcal = meal?.nutrition?.calories || estimateCalories(ingredients);
    return kcal <= 650;
  }

  if (goal === 'budget') {
    return isEasyToShopMeal(meal, 0.75);
  }

  return true;
}

// Map cuisine preference to TheMealDB categories
function getCategoriesForCuisine(cuisine) {
  switch (cuisine) {
    case 'Bulgarian':
      return ['Bulgarian', 'Vegetarian', 'Chicken', 'Pork'];
    case 'Italian':
      return ['Pasta', 'Chicken', 'Seafood', 'Vegetarian'];
    case 'Vegetarian':
      return ['Vegetarian', 'Vegan', 'Pasta'];
    case 'Vegan':
      return ['Vegan', 'Vegetarian'];
    case 'GlutenFree':
      return ['Seafood', 'Chicken', 'Vegetarian'];
    default:
      return MAIN_MEAL_CATEGORIES;
  }
}

function getDietPreference(cuisine, dietary = []) {
  const values = [cuisine, ...dietary.map((item) => item.trim())].filter(Boolean).join(' ').toLowerCase();

  if (values.includes('vegan')) {
    return 'vegan';
  }
  if (values.includes('bulgarian') || values.includes('българ')) {
    return '';
  }
  if (values.includes('vegetarian') || values.includes('вегет')) {
    return 'vegetarian';
  }
  if (values.includes('gluten') || values.includes('безглут')) {
    return 'gluten_free';
  }

  return '';
}

function matchesDietPreference(meal, dietPreference) {
  if (!dietPreference) {
    return true;
  }

  const ingredients = meal.ingredients || [];
  const haystack = [
    meal.strMeal,
    meal.strCategory,
    meal.strArea,
    ...(ingredients.map((ingredient) => ingredient.name)),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const animalProteinPattern =
    /chicken|beef|pork|lamb|goat|turkey|duck|bacon|ham|sausage|mince|minced|meat|fish|seafood|salmon|tuna|cod|anchovy|shrimp|prawn|crab|lobster|oyster|mussel|clam|gelatin/;
  const dairyEggPattern =
    /milk|cream|butter|cheese|yogurt|yoghurt|egg|eggs|mayonnaise|mayo|custard|honey/;
  const glutenPattern = /wheat|flour|pasta|bread|noodle|breadcrumbs|barley|rye|semolina|couscous/;

  switch (dietPreference) {
    case 'vegetarian':
      return !animalProteinPattern.test(haystack);
    case 'vegan':
      return !animalProteinPattern.test(haystack) && !dairyEggPattern.test(haystack);
    case 'gluten_free':
      return !glutenPattern.test(haystack);
    default:
      return true;
  }
}

function matchesWeatherPreference(meal, weatherCategory) {
  if (!weatherCategory || weatherCategory === 'balanced') {
    return true; // No filtering for balanced weather
  }

  const mealName = (meal.strMeal || '').toLowerCase();
  const mealCategory = (meal.strCategory || '').toLowerCase();
  const ingredients = (meal.ingredients || []).map((i) => i.name.toLowerCase()).join(' ');
  const haystack = `${mealName} ${mealCategory} ${ingredients}`;

  // Define meal patterns for each weather
  const patterns = {
    light: /salad|fresh|light|vegetable|fruit|gazpacho|smoothie|raw|cold|ceviche|light|brunch/,
    hot: /soup|stew|roasted|baked|warm|curry|chili|broiled|hot pot|braise|stew|goulash|cassoulet/,
    comfort: /pasta|rice|risotto|potato|creamy|cheese|pot pie|mac and cheese|casserole|baked|gratin/,
  };

  const pattern = patterns[weatherCategory];
  if (!pattern) {
    return true;
  }

  // Light penalty if meal doesn't match perfectly, but still allow it
  return pattern.test(haystack);
}

function getAllowedAreasForCuisine(cuisine) {
  const normalized = normalizeText(cuisine);

  if (!normalized || normalized === 'mix') {
    return MIX_ALLOWED_CUISINES;
  }

  if (normalized === 'bulgarian') {
    return ['bulgarian'];
  }

  if (normalized === 'italian') {
    return ['italian'];
  }

  return [];
}

function matchesCuisinePreference(meal, cuisine, allowedAreas = []) {
  const normalizedCuisine = normalizeText(cuisine);
  if (!normalizedCuisine) {
    return true;
  }

  const area = normalizeText(meal?.strArea);
  const tags = normalizeText(meal?.strTags);
  const category = normalizeText(meal?.strCategory);
  const name = normalizeText(meal?.strMeal);
  const haystack = `${area} ${tags} ${category} ${name}`;

  if (normalizedCuisine === 'mix') {
    return allowedAreas.some((allowed) => haystack.includes(allowed));
  }

  if (normalizedCuisine === 'bulgarian') {
    return haystack.includes('bulgarian') || haystack.includes('българ');
  }

  if (normalizedCuisine === 'italian') {
    return haystack.includes('italian');
  }

  // For non-geographic cuisine types (e.g. Vegetarian/Vegan/GlutenFree),
  // keep diet/category filters as the source of truth.
  return true;
}

export async function generateMenu(options = {}) {
  const {
    people = 4,
    variety = 'medium',
    cuisine = 'mix',
    prepTime = 'any',
    dietary = [],
    allergies = [],
    pantry = [],
    goal = '',
  } = options;

  try {
    const startTime = performance.now();
    const menu = {
      id: generateMenuId(),
      generatedAt: Date.now(),
      options: { people, variety, cuisine, prepTime, dietary, allergies, pantry, goal },
      days: [],
    };
    const usedMealIds = new Set();
    const usedMealSignatures = new Set();

    const cuisineCategories = getCategoriesForCuisine(cuisine);
    const dietPreference = getDietPreference(cuisine, dietary);
    const allowedAreas = getAllowedAreasForCuisine(cuisine);
    const weatherHint = await getWeatherHint().catch(() => null);
    _generationContext = {
      weatherHint,
      goal,
      lastProteinBySlot: { Lunch: '', Dinner: '' },
    };
    _extraDietaryFilter = (dietary || []).filter((d) =>
      ['no_pork', 'no_beef', 'lactose_free', 'no_chicken', 'no_seafood', 'no_nuts', 'gluten_free'].includes(d.trim())
    );

    // Generate 7 days of meals
    for (let day = 0; day < DAYS_OF_WEEK; day++) {
      const dayMeals = {
        day,
        meals: [],
      };

      // Breakfast from Breakfast category
      const breakfast = await getMealForSlot(
        'Breakfast',
        'Breakfast',
        variety,
        day,
        dietPreference,
        cuisine,
        allowedAreas,
        prepTime,
        usedMealIds,
        usedMealSignatures
      );
      if (breakfast) {
        dayMeals.meals.push({ ...breakfast, type: 'Breakfast' });
        usedMealIds.add(breakfast.idMeal);
        usedMealSignatures.add(mealSignature(breakfast));
      }

      // Lunch from cuisine categories
      const lunchCategory = cuisineCategories[day % cuisineCategories.length];
      const lunch = await getMealForSlot(
        lunchCategory,
        'Lunch',
        variety,
        day,
        dietPreference,
        cuisine,
        allowedAreas,
        prepTime,
        usedMealIds,
        usedMealSignatures
      );
      if (lunch) {
        dayMeals.meals.push({ ...lunch, type: 'Lunch' });
        usedMealIds.add(lunch.idMeal);
        usedMealSignatures.add(mealSignature(lunch));
        updateProteinRotation(lunch, 'Lunch');
      }

      // Dinner from cuisine categories (offset to get different category)
      const dinnerCategory = cuisineCategories[(day + 2) % cuisineCategories.length];
      const dinner = await getMealForSlot(
        dinnerCategory,
        'Dinner',
        variety,
        day + 3,
        dietPreference,
        cuisine,
        allowedAreas,
        prepTime,
        usedMealIds,
        usedMealSignatures
      );
      if (dinner) {
        dayMeals.meals.push({ ...dinner, type: 'Dinner' });
        usedMealIds.add(dinner.idMeal);
        usedMealSignatures.add(mealSignature(dinner));
        updateProteinRotation(dinner, 'Dinner');
      }

      // Fallback: fill specifically the missing slots so we always have Breakfast/Lunch/Dinner once each.
      const getMissingMealType = () => {
        const present = new Set(dayMeals.meals.map((meal) => meal.type));
        return MEAL_SLOTS.find((slot) => !present.has(slot)) || null;
      };

      while (dayMeals.meals.length < MEALS_PER_DAY) {
        const mealType = getMissingMealType();
        if (!mealType) {
          break;
        }
        let randomMeal = await getCompatibleRandomMeal(
          dietPreference,
          cuisine,
          allowedAreas,
          prepTime,
          mealType,
          usedMealIds,
          usedMealSignatures
        );

        // Progressive fallback so each day is always fully populated.
        if (!randomMeal) {
          randomMeal = await getCompatibleRandomMeal(
            dietPreference,
            cuisine,
            allowedAreas,
            prepTime,
            mealType,
            usedMealIds,
            usedMealSignatures,
            {
              ignoreEasyToShop: true,
              allowReuse: false,
            }
          );
        }

        if (!randomMeal) {
          randomMeal = await getCompatibleRandomMeal(
            dietPreference,
            cuisine,
            allowedAreas,
            prepTime,
            mealType,
            usedMealIds,
            usedMealSignatures,
            {
              ignoreEasyToShop: true,
              allowReuse: true,
              allowProteinRepeat: true,
              ignoreGoal: true,
              ignoreCuisine: true,
              maxAttempts: 40,
            }
          );
        }

        if (!randomMeal) {
          randomMeal = await getFallbackMealFromPools(
            mealType,
            dietPreference,
            cuisine,
            allowedAreas,
            prepTime,
            usedMealIds,
            usedMealSignatures
          );
        }

        if (randomMeal) {
          dayMeals.meals.push({ ...randomMeal, type: mealType });
          usedMealIds.add(randomMeal.idMeal);
          usedMealSignatures.add(mealSignature(randomMeal));
          updateProteinRotation(randomMeal, mealType);
        } else {
          break;
        }
      }

      // Keep deterministic ordering in UI and exports.
      dayMeals.meals.sort((a, b) => MEAL_SLOTS.indexOf(a.type) - MEAL_SLOTS.indexOf(b.type));

      menu.days.push(dayMeals);
    }

    const endTime = performance.now();
    menu.generationTime = ((endTime - startTime) / 1000).toFixed(1);

    // Save to localStorage
    saveCurrentMenu(menu);
    return menu;
  } catch (error) {
    console.error('Menu generation failed:', error);
    throw new Error('Failed to generate menu: ' + error.message);
  }
}

async function getMealForSlot(
  category,
  slotType,
  variety,
  offset = 0,
  dietPreference = '',
  cuisinePreference = 'mix',
  allowedAreas = [],
  prepTimePreference = 'any',
  usedMealIds = new Set(),
  usedMealSignatures = new Set(),
  options = {}
) {
  const { allowProteinRepeat = false } = options;
  try {
    const meals = await fetchMealsByCategory(category);
    if (!meals || meals.length === 0) {
      const random = await getCompatibleRandomMeal(
        dietPreference,
        cuisinePreference,
        allowedAreas,
        prepTimePreference,
        slotType,
        usedMealIds,
        usedMealSignatures
      );
      return random || null;
    }

    // Select meal based on variety setting
    let index = 0;
    if (variety === 'high') {
      // Random selection for high variety
      index = Math.floor(Math.random() * meals.length);
    } else if (variety === 'medium') {
      // Pseudo-random but not fully random
      index = (offset * 3 + Math.floor(Math.random() * 5)) % meals.length;
    } else {
      // Low variety - use offset to cycle through
      index = (offset * 3) % meals.length;
    }

    const candidateIndexes = Array.from({ length: meals.length }, (_, itemIndex) =>
      (index + itemIndex) % meals.length
    );

    for (const candidateIndex of candidateIndexes.slice(0, 24)) {
      const candidate = meals.at(candidateIndex);
      try {
        const details = await fetchMealDetails(candidate.idMeal);
        details.ingredients = extractIngredients(details);

        // Get weather recommendation for this meal
        const weatherCategory = _generationContext?.weatherHint
          ? getWeatherMealCategory(_generationContext.weatherHint)
          : 'balanced';

        if (
          hasRequiredIngredients(details) &&
          !usedMealIds.has(details.idMeal) &&
          !usedMealSignatures.has(mealSignature(details)) &&
          matchesMealSlot(details, slotType) &&
          matchesGenerationContext(details, slotType, allowProteinRepeat) &&
          matchesDietPreference(details, dietPreference) &&
          matchesCuisinePreference(details, cuisinePreference, allowedAreas) &&
          matchesPrepTime(details, prepTimePreference) &&
          matchesDietaryExclusions(details) &&
          matchesWeatherPreference(details, weatherCategory) &&
          isEasyToShopMeal(details)
        ) {
          return details;
        }
      } catch (error) {
        console.warn(`Skipping candidate ${candidate?.idMeal || 'unknown'}:`, error);
      }
    }

    return await getCompatibleRandomMeal(
      dietPreference,
      cuisinePreference,
      allowedAreas,
      prepTimePreference,
      slotType,
      usedMealIds,
      usedMealSignatures
    );
  } catch (error) {
    console.error('Failed to get meal for slot:', error);
    return null;
  }
}

function matchesPrepTime(meal, prepTimePreference = 'any') {
  if (!prepTimePreference || prepTimePreference === 'any') {
    return true;
  }

  const minutes = estimatePrepTime(meal.strInstructions || '', meal.strCategory || '');
  meal.metadata = {
    ...(meal.metadata || {}),
    prepTime: minutes,
  };

  if (prepTimePreference === 'quick') {
    return minutes <= 25;
  }
  if (prepTimePreference === 'medium') {
    return minutes <= 45;
  }
  if (prepTimePreference === 'long') {
    return minutes > 45;
  }

  return true;
}

async function getCompatibleRandomMeal(
  dietPreference,
  cuisinePreference = 'mix',
  allowedAreas = [],
  prepTimePreference = 'any',
  slotType = '',
  usedMealIds = new Set(),
  usedMealSignatures = new Set(),
  options = {}
) {
  const {
    ignoreEasyToShop = false,
    allowReuse = false,
    allowProteinRepeat = false,
    ignoreGoal = false,
    ignoreCuisine = false,
    maxAttempts = 30,
  } = options;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const randomMeal = await getRandomMeal();
      if (!randomMeal) {
        continue;
      }

      const details = await fetchMealDetails(randomMeal.idMeal);
      details.ingredients = extractIngredients(details);

      if (
        hasRequiredIngredients(details) &&
        (allowReuse || !usedMealIds.has(details.idMeal)) &&
        (allowReuse || !usedMealSignatures.has(mealSignature(details))) &&
        matchesMealSlot(details, slotType) &&
        (ignoreGoal
          ? matchesWeatherPreference(details, slotType) && matchesProteinRotation(details, slotType, allowProteinRepeat)
          : matchesGenerationContext(details, slotType, allowProteinRepeat)) &&
        matchesDietPreference(details, dietPreference) &&
        (ignoreCuisine || matchesCuisinePreference(details, cuisinePreference, allowedAreas)) &&
        matchesPrepTime(details, prepTimePreference) &&
        matchesDietaryExclusions(details) &&
        (ignoreEasyToShop || isEasyToShopMeal(details))
      ) {
        return details;
      }
    } catch (error) {
      console.warn('Random meal fallback failed on attempt:', attempt + 1, error);
    }
  }

  return null;
}

async function getFallbackMealFromPools(
  slotType,
  dietPreference,
  cuisinePreference,
  allowedAreas,
  prepTimePreference,
  usedMealIds,
  usedMealSignatures
) {
  const categories =
    slotType === 'Breakfast'
      ? ['Breakfast', 'Vegetarian', 'Vegan', 'Pasta']
      : ['Chicken', 'Beef', 'Pork', 'Lamb', 'Seafood', 'Vegetarian', 'Vegan', 'Pasta'];

  const strictnessLevels = [
    { allowReuse: false, allowProteinRepeat: false, ignoreEasyToShop: false, ignoreCuisine: false },
    { allowReuse: false, allowProteinRepeat: false, ignoreEasyToShop: true, ignoreCuisine: false },
    { allowReuse: true, allowProteinRepeat: false, ignoreEasyToShop: true, ignoreCuisine: false },
    { allowReuse: true, allowProteinRepeat: true, ignoreEasyToShop: true, ignoreCuisine: true },
  ];

  for (const rules of strictnessLevels) {
    for (const category of categories) {
      try {
        const meals = shuffle(await fetchMealsByCategory(category));
        for (const candidate of meals.slice(0, 40)) {
          const details = await fetchMealDetails(candidate.idMeal);
          details.ingredients = extractIngredients(details);

          if (
            hasRequiredIngredients(details) &&
            (rules.allowReuse || !usedMealIds.has(details.idMeal)) &&
            (rules.allowReuse || !usedMealSignatures.has(mealSignature(details))) &&
            matchesMealSlot(details, slotType) &&
            matchesGenerationContext(details, slotType, rules.allowProteinRepeat) &&
            matchesDietPreference(details, dietPreference) &&
            (rules.ignoreCuisine || matchesCuisinePreference(details, cuisinePreference, allowedAreas)) &&
            matchesPrepTime(details, prepTimePreference) &&
            matchesDietaryExclusions(details) &&
            (rules.ignoreEasyToShop || isEasyToShopMeal(details))
          ) {
            return details;
          }
        }
      } catch (error) {
        console.warn(`Fallback pool failed for ${category}:`, error);
      }
    }
  }

  return null;
}

export async function enrichMenuWithDetails(menu) {
  // Fetch full details for each meal to get ingredients
  for (const day of menu.days) {
    for (const meal of day.meals) {
      try {
        // This is async - you'd need to handle it in the UI
        // For now, just mark that details are available
        if (!meal.ingredients) {
          meal.ingredients = [];
        }
      } catch (error) {
        console.error('Failed to enrich meal:', error);
      }
    }
  }
  return menu;
}

export function getMealInstructions(mealDetails) {
  return mealDetails.strInstructions || '';
}

export function getMealImage(mealDetails) {
  return mealDetails.strMealThumb || '';
}

export function getMealCategory(mealDetails) {
  return mealDetails.strCategory || 'Uncategorized';
}

export function getMealArea(mealDetails) {
  return mealDetails.strArea || 'Unknown';
}

function generateMenuId() {
  return `menu_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function getMenuStats(menu) {
  const stats = {
    totalMeals: menu.days.length * MEALS_PER_DAY,
    days: DAYS_OF_WEEK,
    mealsPerDay: MEALS_PER_DAY,
    generationTime: menu.generationTime,
  };
  return stats;
}

export async function swapMealInMenu(menu, dayIndex, mealIndex) {
  const options = menu.options || {};
  const {
    variety = 'medium',
    cuisine = 'mix',
    prepTime = 'any',
    dietary = [],
  } = options;

  const day = menu.days[dayIndex];
  if (!day) {
    return null;
  }
  const oldMeal = day.meals[mealIndex];
  if (!oldMeal) {
    return null;
  }

  _extraDietaryFilter = (dietary || []).filter((d) =>
    ['no_pork', 'no_beef', 'lactose_free', 'no_chicken', 'no_seafood', 'no_nuts', 'gluten_free'].includes(d.trim())
  );

  const usedMealIds = new Set(
    menu.days.flatMap((d) => d.meals.map((m) => m.idMeal)).filter(Boolean)
  );
  const usedMealSignatures = new Set(
    menu.days.flatMap((d) => d.meals.map((m) => mealSignature(m))).filter(Boolean)
  );

  const mealType = oldMeal.type || 'Lunch';
  const cuisineCategories = shuffle([...getCategoriesForCuisine(cuisine)]);
  const dietPreference = getDietPreference(cuisine, dietary);
  const allowedAreas = getAllowedAreasForCuisine(cuisine);

  let newMeal = null;

  if (mealType === 'Breakfast') {
    newMeal = await getMealForSlot(
      'Breakfast',
      'Breakfast',
      variety,
      Math.floor(Math.random() * 20),
      dietPreference,
      cuisine,
      allowedAreas,
      prepTime,
      usedMealIds,
      usedMealSignatures
    );
  } else {
    for (const cat of cuisineCategories) {
      newMeal = await getMealForSlot(
        cat,
        mealType,
        variety,
        Math.floor(Math.random() * 20),
        dietPreference,
        cuisine,
        allowedAreas,
        prepTime,
        usedMealIds,
        usedMealSignatures
      );
      if (newMeal) {
        break;
      }
    }
  }

  if (!newMeal) {
    newMeal = await getCompatibleRandomMeal(
      dietPreference,
      cuisine,
      allowedAreas,
      prepTime,
      mealType,
      usedMealIds,
      usedMealSignatures,
      { ignoreEasyToShop: true, allowReuse: false }
    );
  }

  _extraDietaryFilter = [];

  if (!newMeal || newMeal.idMeal === oldMeal.idMeal) {
    return null;
  }
  return { ...newMeal, type: mealType };
}
