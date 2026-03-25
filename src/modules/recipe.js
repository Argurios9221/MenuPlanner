// Recipe management and display
import { fetchMealDetails, extractIngredients } from './api.js';
import { addFavoriteRecipe, isFavoriteRecipe as checkFavRecipe, removeFavoriteRecipe } from './storage.js';
import {
  translateInstructions,
  translateIngredientAsync,
  translateText,
} from './translation.js';
import { getRecipeMetadata, detectAllergens } from './metadata.js';

export async function loadRecipe(mealId) {
  try {
    const details = await fetchMealDetails(mealId);
    return enrichRecipeData(details);
  } catch (error) {
    console.error('Failed to load recipe:', error);
    throw error;
  }
}

// Re-export for convenience
export function isFavoriteRecipe(mealId) {
  return checkFavRecipe(mealId);
}

function enrichRecipeData(mealDetails) {
  return {
    idMeal: mealDetails.idMeal,
    strMeal: mealDetails.strMeal,
    strCategory: mealDetails.strCategory || 'Main',
    strArea: mealDetails.strArea || 'Unknown',
    strInstructions: mealDetails.strInstructions,
    strMealThumb: mealDetails.strMealThumb,
    strTags: mealDetails.strTags || '',
    strYoutube: mealDetails.strYoutube || '',
    sourceUrl: mealDetails.sourceUrl || '',
    readyInMinutes: mealDetails.readyInMinutes || 0,
    servings: mealDetails.servings || 4,
    nutrition: mealDetails.nutrition || null,
    _source: mealDetails._source || '',
    ingredients: extractIngredients(mealDetails),
    metadata: getRecipeMetadata(mealDetails),
    allergens: detectAllergens(extractIngredients(mealDetails)),
  };
}

export async function getTranslatedRecipe(mealId, targetLang = 'bg') {
  const recipe = await loadRecipe(mealId);

  if (targetLang === 'en') {
    return recipe;
  }

  try {
    recipe.strMealTranslated = await translateText(recipe.strMeal, targetLang);
    recipe.strCategoryTranslated = await translateText(recipe.strCategory, targetLang);
    recipe.strAreaTranslated = await translateText(recipe.strArea, targetLang);

    // Translate instructions (split by sentences to respect API char limit)
    recipe.strInstructionsTranslated = await translateInstructions(recipe.strInstructions, targetLang);

    // Translate ingredient names
    recipe.ingredientsTranslated = await Promise.all(
      recipe.ingredients.map(async (ing) => ({
        ...ing,
        nameTranslated: await translateIngredientAsync(ing.name, targetLang),
        measureTranslated: ing.measure ? await translateText(ing.measure, targetLang) : ing.measure,
      }))
    );

    return recipe;
  } catch (error) {
    console.error('Failed to translate recipe:', error);
    return recipe; // Return original if translation fails
  }
}

export function toggleRecipeFavorite(recipe) {
  if (isFavoriteRecipe(recipe.idMeal)) {
    removeFavoriteRecipe(recipe.idMeal);
    return false;
  } else {
    addFavoriteRecipe(recipe);
    return true;
  }
}

export function formatIngredients(recipe, lang = 'en') {
  if (lang === 'bg' && recipe.ingredientsTranslated) {
    return recipe.ingredientsTranslated.map((ing) => ({
      name: ing.nameTranslated || ing.name,
      measure: ing.measureTranslated || ing.measure,
    }));
  }
  return recipe.ingredients;
}

export function formatInstructions(recipe, lang = 'en') {
  if (lang === 'bg' && recipe.strInstructionsTranslated) {
    return recipe.strInstructionsTranslated;
  }
  return recipe.strInstructions;
}

export function generateRecipeUrl(mealId) {
  return `https://www.thecocktaildb.com/api/json/v1/1/lookup.php?i=${mealId}`;
}

export function formatRecipeSummary(recipe) {
  return `
📋 ${recipe.strMeal}
🏷️ ${recipe.strCategory} - ${recipe.strArea}
⏱️ ~${recipe.metadata.prepTime} minutes
⚙️ ${recipe.metadata.difficulty}

${recipe.strInstructions.substring(0, 200)}...
  `.trim();
}

export function getRecipeImage(recipe, _size = 'large') {
  // TheMealDB doesn't have different sizes, but we can add this for future proofing
  return recipe.strMealThumb;
}

export function parseRecipeYoutubeId(youtubeUrl) {
  if (!youtubeUrl) {
    return null;
  }
  const match = youtubeUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

export function buildRecipeCard(recipe, options = {}) {
  const { showFavorite = true, showShare = true, favorites = false } = options;

  return {
    id: recipe.idMeal,
    name: recipe.strMeal,
    category: recipe.strCategory,
    area: recipe.strArea,
    image: recipe.strMealThumb,
    difficulty: recipe.metadata.difficulty,
    prepTime: recipe.metadata.prepTime,
    isFavorite: favorites,
    showFavorite,
    showShare,
  };
}
