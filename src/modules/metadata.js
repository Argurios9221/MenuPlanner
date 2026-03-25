// Recipe metadata enrichment and analysis
import { extractIngredients } from './api.js';

// Estimate difficulty based on instruction complexity
export function estimateDifficulty(instructions) {
  if (!instructions) {
    return 'Medium';
  }

  const length = instructions.length;
  const stepCount = (instructions.match(/step|add|mix|cook|bake|heat|slice/gi) || []).length;

  if (length < 200 || stepCount < 3) {
    return 'Easy';
  }
  if (length < 500 || stepCount < 6) {
    return 'Medium';
  }
  if (length < 800 || stepCount < 10) {
    return 'Hard';
  }
  return 'Very Hard';
}

// Estimate prep time based on instruction length and keywords
export function estimatePrepTime(instructions, category = '') {
  if (!instructions) {
    return 30;
  }

  const length = instructions.length;
  const baseTime = 10 + Math.ceil(length / 100);

  // Category-based adjustments
  const categoryTimes = {
    dessert: 0.8,
    pasta: 1.1,
    soup: 1.3,
    bread: 2.0,
    seafood: 1.2,
    beef: 1.4,
    vegetarian: 0.9,
  };

  const categoryKey = category.toLowerCase();
  const multiplier =
    Object.entries(categoryTimes).find(([key]) => categoryKey.includes(key))?.[1] || 1;

  const estimatedTime = Math.round(baseTime * multiplier);
  return Math.min(estimatedTime, 120);
}

// Estimate calories per serving (rough estimate)
export function estimateCalories(ingredients) {
  if (!ingredients || ingredients.length === 0) {
    return 300;
  }

  const calorieMap = {
    oil: 120,
    butter: 100,
    cream: 50,
    cheese: 80,
    meat: 60,
    chicken: 45,
    fish: 35,
    egg: 70,
    pasta: 40,
    rice: 35,
    bread: 25,
    vegetable: 10,
    fruit: 15,
    sugar: 50,
    flour: 30,
  };

  let totalCalories = 0;
  for (const ingredient of ingredients) {
    const name = ingredient.name.toLowerCase();
    for (const [key, cal] of Object.entries(calorieMap)) {
      if (name.includes(key)) {
        totalCalories += cal;
        break;
      }
    }
  }

  return Math.max(totalCalories, 200) || 300;
}

// Detect potential allergens in recipe
export function detectAllergens(ingredients) {
  const allergens = {};

  const allergenMap = {
    nuts: ['nut', 'peanut', 'almond', 'walnut', 'cashew', 'pistachio'],
    shellfish: ['shrimp', 'prawn', 'crab', 'lobster', 'oyster', 'mussel', 'clam'],
    fish: ['fish', 'salmon', 'tuna', 'cod', 'halibut', 'anchovy'],
    dairy: ['milk', 'cheese', 'cream', 'butter', 'yogurt', 'ricotta'],
    gluten: ['wheat', 'flour', 'pasta', 'bread', 'grain', 'barley', 'rye'],
    eggs: ['egg'],
    soy: ['soy', 'tofu'],
    sesame: ['sesame'],
  };

  for (const ingredient of ingredients) {
    const name = ingredient.name.toLowerCase();
    for (const [allergen, keywords] of Object.entries(allergenMap)) {
      if (keywords.some((keyword) => name.includes(keyword))) {
        if (!allergens[allergen]) {
          allergens[allergen] = [];
        }
        allergens[allergen].push(ingredient.name);
      }
    }
  }

  return allergens;
}

// Analyze recipe nutritional profile
export function analyzeNutrition(mealDetails) {
  const ingredients = extractIngredients(mealDetails);
  const allergens = detectAllergens(ingredients);

  return {
    estimatedCalories: estimateCalories(ingredients),
    servings: 4,
    ingredientCount: ingredients.length,
    allergens: Object.keys(allergens),
    allergenDetails: allergens,
  };
}

// Calculate recipe difficulty score (0-100)
export function calculateDifficultyScore(instructions) {
  let score = 30; // Base score

  if (!instructions) {
    return score;
  }

  const indicators = {
    simmer: 10,
    whisk: 8,
    fold: 12,
    temper: 15,
    whip: 8,
    braise: 12,
    reduce: 8,
    deglaze: 10,
    emulsify: 15,
    julienne: 8,
    dice: 5,
    chop: 3,
  };

  for (const [term, points] of Object.entries(indicators)) {
    if (instructions.toLowerCase().includes(term)) {
      score += points;
    }
  }

  // Length penalty
  score += Math.min(instructions.length / 50, 20);

  return Math.min(score, 100);
}

// Get recipe complexity metadata
export function getRecipeMetadata(mealDetails) {
  const instructions = mealDetails.strInstructions || '';
  const category = mealDetails.strCategory || 'Main';
  const ingredients = extractIngredients(mealDetails);

  return {
    title: mealDetails.strMeal,
    category: category,
    area: mealDetails.strArea || 'Unknown',
    image: mealDetails.strMealThumb,
    difficulty: estimateDifficulty(instructions),
    difficultyScore: calculateDifficultyScore(instructions),
    prepTime: estimatePrepTime(instructions, category),
    cookTime: estimatePrepTime(instructions, category) * 0.6, // Estimate
    servings: 4,
    ingredients: ingredients,
    ingredientCount: ingredients.length,
    nutrition: analyzeNutrition(mealDetails),
    instructions: instructions,
    tags: (mealDetails.strTags || '').split(',').filter((tag) => tag.trim()),
  };
}

// Format metadata for display
export function formatMetadata(metadata) {
  return {
    ...metadata,
    prepTimeLabel: `~${Math.round(metadata.prepTime)} mins`,
    totalTimeLabel: `~${Math.round(metadata.prepTime + metadata.cookTime)} mins`,
    caloriesLabel: `${metadata.nutrition.estimatedCalories} cal/serving`,
    allergensLabel: metadata.nutrition.allergens.join(', ') || 'None',
  };
}

// Compare recipe difficulty
export function compareRecipeDifficulty(recipe1, recipe2) {
  const diff1 = calculateDifficultyScore(recipe1.strInstructions);
  const diff2 = calculateDifficultyScore(recipe2.strInstructions);
  return diff1 - diff2;
}

// Rate recipe based on various factors
export function rateRecipeComplexity(mealDetails) {
  const score = calculateDifficultyScore(mealDetails.strInstructions || '');

  if (score < 40) {
    return { level: 'Beginner', emoji: '🟢', score };
  }
  if (score < 60) {
    return { level: 'Intermediate', emoji: '🟡', score };
  }
  if (score < 80) {
    return { level: 'Advanced', emoji: '🔴', score };
  }
  return { level: 'Expert', emoji: '🔥', score };
}
