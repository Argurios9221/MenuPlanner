// Favorites management and display
import {
  getFavorites,
  saveFavorites,
  removeFavoriteRecipe as removeFavRecipeFromStorage,
} from './storage.js';

// Re-export for convenience
export function removeFavoriteRecipe(mealId) {
  return removeFavRecipeFromStorage(mealId);
}

export function getAllFavorites() {
  return getFavorites();
}

export function getFavoritesCount() {
  const favorites = getFavorites();
  return {
    menus: favorites.menus.length,
    recipes: favorites.recipes.length,
    products: favorites.products.length,
    total: favorites.menus.length + favorites.recipes.length + favorites.products.length,
  };
}

export function searchFavorites(query, type = 'all') {
  const favorites = getFavorites();
  const q = query.toLowerCase();
  const results = {
    menus: [],
    recipes: [],
    products: [],
  };

  if (type === 'all' || type === 'menus') {
    results.menus = favorites.menus.filter(
      (m) =>
        m.options?.notes?.toLowerCase().includes(q) ||
        JSON.stringify(m.options).toLowerCase().includes(q)
    );
  }

  if (type === 'all' || type === 'recipes') {
    results.recipes = favorites.recipes.filter((r) => r.strMeal?.toLowerCase().includes(q));
  }

  if (type === 'all' || type === 'products') {
    results.products = favorites.products.filter((p) => p.name?.toLowerCase().includes(q));
  }

  return type === 'all' ? results : results[type + 's'];
}

export function sortFavoritesByDate(favorites, descending = true) {
  return favorites.sort((a, b) => {
    const aTime = a.savedAt || 0;
    const bTime = b.savedAt || 0;
    return descending ? bTime - aTime : aTime - bTime;
  });
}

export function getRecipeFavorites() {
  return getFavorites().recipes;
}

export function getMenuFavorites() {
  return getFavorites().menus;
}

export function getProductFavorites() {
  return getFavorites().products;
}

export function formatFavoritesForExport(favorites, format = 'json') {
  if (format === 'json') {
    return JSON.stringify(favorites, null, 2);
  }

  if (format === 'csv') {
    let csv = 'Type,Name,SavedAt\n';

    for (const menu of favorites.menus) {
      csv += `Menu,"${menu.id}",${new Date(menu.savedAt).toISOString()}\n`;
    }

    for (const recipe of favorites.recipes) {
      csv += `Recipe,"${recipe.strMeal}",${new Date(recipe.savedAt).toISOString()}\n`;
    }

    for (const product of favorites.products) {
      csv += `Product,"${product.name}",${new Date(product.savedAt).toISOString()}\n`;
    }

    return csv;
  }

  if (format === 'text') {
    let text = 'SAVED FAVORITES\n';
    text += '='.repeat(50) + '\n\n';

    if (favorites.menus.length > 0) {
      text += 'MENUS\n' + '-'.repeat(50) + '\n';
      for (const menu of favorites.menus) {
        text += `ID: ${menu.id}\n`;
        text += `People: ${menu.options?.people || 'N/A'}\n`;
        text += `Saved: ${new Date(menu.savedAt).toLocaleDateString()}\n\n`;
      }
    }

    if (favorites.recipes.length > 0) {
      text += '\nRECIPES\n' + '-'.repeat(50) + '\n';
      for (const recipe of favorites.recipes) {
        text += `${recipe.strMeal}\n`;
        text += `Category: ${recipe.strCategory}\n`;
        text += `Saved: ${new Date(recipe.savedAt).toLocaleDateString()}\n\n`;
      }
    }

    if (favorites.products.length > 0) {
      text += '\nPRODUCTS\n' + '-'.repeat(50) + '\n';
      for (const product of favorites.products) {
        text += `${product.name}\n`;
        text += `Saved: ${new Date(product.savedAt).toLocaleDateString()}\n\n`;
      }
    }

    return text;
  }

  return null;
}

export function importFavorites(data, format = 'json') {
  try {
    let favorites = null;

    if (format === 'json') {
      favorites = JSON.parse(data);
    } else if (format === 'text') {
      // Parse text format - simplified version
      favorites = { menus: [], recipes: [], products: [] };
    }

    if (favorites && favorites.menus && favorites.recipes && favorites.products) {
      saveFavorites(favorites);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to import favorites:', error);
    return false;
  }
}

export function mergeFavorites(newFavorites) {
  const current = getFavorites();

  // Merge menus
  const menuIds = new Set(current.menus.map((m) => m.id));
  for (const menu of newFavorites.menus) {
    if (!menuIds.has(menu.id)) {
      current.menus.push(menu);
    }
  }

  // Merge recipes
  const recipeIds = new Set(current.recipes.map((r) => r.idMeal));
  for (const recipe of newFavorites.recipes) {
    if (!recipeIds.has(recipe.idMeal)) {
      current.recipes.push(recipe);
    }
  }

  // Merge products
  const productNames = new Set(current.products.map((p) => p.name));
  for (const product of newFavorites.products) {
    if (!productNames.has(product.name)) {
      current.products.push(product);
    }
  }

  saveFavorites(current);
  return current;
}

export function clearAllFavorites() {
  saveFavorites({ menus: [], recipes: [], products: [] });
}
