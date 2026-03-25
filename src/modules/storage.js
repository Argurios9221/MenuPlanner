// localStorage management and data persistence
const STORAGE_KEYS = {
  FAVORITES: 'menuPlanner_favorites',
  PREFERENCES: 'menuPlanner_preferences',
  CHECKED_ITEMS: 'menuPlanner_checkedItems',
  TRANSLATION_CACHE: 'menuPlanner_translationCache',
  LANG: 'menuPlanner_lang',
  CURRENT_MENU: 'menuPlanner_currentMenu',
  THEME: 'menuPlanner_theme',
};

const DEFAULT_PREFERENCES = {
  people: 4,
  variety: 'medium',
  cuisine: 'mix',
  prepTime: 'any',
  dietary: [],
  allergies: [],
  notes: '',
};

// Favorites schema: { menus: [...], recipes: [...], products: [...] }
export function getFavorites() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.FAVORITES);
    if (!saved) {
      return { menus: [], recipes: [], products: [] };
    }
    return JSON.parse(saved);
  } catch (error) {
    console.error('Failed to parse favorites:', error);
    return { menus: [], recipes: [], products: [] };
  }
}

export function saveFavorites(favorites) {
  try {
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
  } catch (error) {
    console.error('Failed to save favorites:', error);
  }
}

export function addFavoriteMenu(menu) {
  const favorites = getFavorites();
  const signature = buildMenuSignature(menu);

  const existing = favorites.menus.find((savedMenu) => {
    const savedSignature = savedMenu.signature || buildMenuSignature(savedMenu);
    return savedSignature === signature;
  });

  if (existing) {
    return { id: existing.id, added: false };
  }

  const menuId = generateId();
  const favoriteMenu = {
    id: menuId,
    ...menu,
    signature,
    savedAt: Date.now(),
  };
  favorites.menus.push(favoriteMenu);
  saveFavorites(favorites);
  return { id: menuId, added: true };
}

export function removeFavoriteMenu(menuId) {
  const favorites = getFavorites();
  favorites.menus = favorites.menus.filter((m) => m.id !== menuId);
  saveFavorites(favorites);
}

export function addFavoriteRecipe(recipe) {
  const favorites = getFavorites();
  if (!favorites.recipes.some((r) => r.idMeal === recipe.idMeal)) {
    favorites.recipes.push({
      ...recipe,
      savedAt: Date.now(),
    });
    saveFavorites(favorites);
  }
}

export function removeFavoriteRecipe(mealId) {
  const favorites = getFavorites();
  favorites.recipes = favorites.recipes.filter((r) => r.idMeal !== mealId);
  saveFavorites(favorites);
}

export function isFavoriteRecipe(mealId) {
  const favorites = getFavorites();
  return favorites.recipes.some((r) => r.idMeal === mealId);
}

export function addFavoriteProduct(product) {
  const favorites = getFavorites();
  if (!favorites.products.some((p) => p.name === product.name)) {
    favorites.products.push({
      ...product,
      id: generateId(),
      savedAt: Date.now(),
    });
    saveFavorites(favorites);
  }
}

export function removeFavoriteProduct(productName) {
  const favorites = getFavorites();
  favorites.products = favorites.products.filter((p) => p.name !== productName);
  saveFavorites(favorites);
}

export function getPreferences() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
    if (!saved) {
      return { ...DEFAULT_PREFERENCES };
    }
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) };
  } catch (error) {
    console.error('Failed to parse preferences:', error);
    return { ...DEFAULT_PREFERENCES };
  }
}

export function savePreferences(prefs) {
  try {
    localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(prefs));
  } catch (error) {
    console.error('Failed to save preferences:', error);
  }
}

export function getCheckedItems() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.CHECKED_ITEMS);
    return saved ? JSON.parse(saved) : {};
  } catch (error) {
    console.error('Failed to parse checked items:', error);
    return {};
  }
}

export function saveCheckedItems(items) {
  try {
    localStorage.setItem(STORAGE_KEYS.CHECKED_ITEMS, JSON.stringify(items));
  } catch (error) {
    console.error('Failed to save checked items:', error);
  }
}

export function toggleCheckedItem(itemKey) {
  const items = getCheckedItems();
  items[itemKey] = !items[itemKey];
  saveCheckedItems(items);
  return items[itemKey];
}

export function getTranslationCache() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.TRANSLATION_CACHE);
    return saved ? JSON.parse(saved) : {};
  } catch (error) {
    console.error('Failed to parse translation cache:', error);
    return {};
  }
}

export function saveTranslationCache(cache) {
  try {
    localStorage.setItem(STORAGE_KEYS.TRANSLATION_CACHE, JSON.stringify(cache));
  } catch (error) {
    console.error('Failed to save translation cache:', error);
  }
}

export function getCachedTranslation(text, lang) {
  const cache = getTranslationCache();
  const key = `${text}_${lang}`;
  return cache[key];
}

export function cacheCachedTranslation(text, lang, translation) {
  const cache = getTranslationCache();
  const key = `${text}_${lang}`;
  cache[key] = translation;
  saveTranslationCache(cache);
}

export function getCurrentMenu() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_MENU);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.error('Failed to parse current menu:', error);
    return null;
  }
}

export function saveCurrentMenu(menu) {
  try {
    localStorage.setItem(STORAGE_KEYS.CURRENT_MENU, JSON.stringify(menu));
  } catch (error) {
    console.error('Failed to save current menu:', error);
  }
}

export function clearCurrentMenu() {
  try {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_MENU);
  } catch (error) {
    console.error('Failed to clear current menu:', error);
  }
}

export function getTheme() {
  try {
    return localStorage.getItem(STORAGE_KEYS.THEME) || 'light';
  } catch {
    return 'light';
  }
}

export function saveTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  } catch (error) {
    console.error('Failed to save theme:', error);
  }
}

export function clearAllData() {
  try {
    Object.values(STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key);
    });
  } catch (error) {
    console.error('Failed to clear all data:', error);
  }
}

// Utility function to generate unique IDs
function generateId() {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function buildMenuSignature(menu) {
  const daySignatures = (menu?.days || []).map((day) =>
    (day.meals || []).map((meal) => meal.idMeal || meal.strMeal || '').join('|')
  );
  return daySignatures.join('::');
}

export { STORAGE_KEYS };
