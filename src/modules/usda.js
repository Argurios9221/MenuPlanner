const USDA_API_KEY = import.meta.env.VITE_USDA_API_KEY || '';
const USDA_SEARCH_API = 'https://api.nal.usda.gov/fdc/v1/foods/search';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const cache = new Map();

function hasKey() {
  return Boolean(String(USDA_API_KEY).trim());
}

function cacheKey(prefix, query) {
  return `${prefix}_${String(query || '').trim().toLowerCase()}`;
}

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) {
    return null;
  }
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function setCached(key, value) {
  cache.set(key, { ts: Date.now(), value });
}

function withTimeout(promise, timeoutMs = 2500) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(null), timeoutMs)),
  ]);
}

function extractNutrients(food = {}) {
  const list = Array.isArray(food.foodNutrients) ? food.foodNutrients : [];
  const getValue = (names) => {
    const row = list.find((item) => names.includes(String(item?.nutrientName || '').toLowerCase()));
    const value = Number(row?.value);
    return Number.isFinite(value) ? Math.round(value) : 0;
  };

  return {
    calories: getValue(['energy', 'energy (kcal)']),
    protein: getValue(['protein']),
    carbs: getValue(['carbohydrate, by difference', 'carbohydrate']),
    fat: getValue(['total lipid (fat)', 'fat']),
    fiber: getValue(['fiber, total dietary', 'dietary fiber']),
  };
}

export async function fetchUsdaProductByName(name) {
  const query = String(name || '').trim();
  if (!query || query.length < 3 || !hasKey()) {
    return null;
  }

  const key = cacheKey('usda_product', query);
  const cached = getCached(key);
  if (cached !== null) {
    return cached;
  }

  try {
    const params = new URLSearchParams({
      query,
      pageSize: '1',
      api_key: USDA_API_KEY,
    });
    const response = await withTimeout(fetch(`${USDA_SEARCH_API}?${params.toString()}`));
    if (!response || !response.ok) {
      setCached(key, null);
      return null;
    }

    const data = await response.json();
    const first = Array.isArray(data?.foods) ? data.foods[0] : null;
    if (!first) {
      setCached(key, null);
      return null;
    }

    const value = {
      description: first.description || query,
      brandName: first.brandName || '',
      nutrition: extractNutrients(first),
      source: 'usda',
    };
    setCached(key, value);
    return value;
  } catch {
    setCached(key, null);
    return null;
  }
}

export async function fetchUsdaNutritionForIngredients(ingredients = []) {
  if (!hasKey()) {
    return null;
  }

  const tokens = (Array.isArray(ingredients) ? ingredients : [])
    .map((item) => String(item?.name || item || '').toLowerCase().trim())
    .filter((value) => value.length >= 3)
    .slice(0, 4);

  if (!tokens.length) {
    return null;
  }

  const query = tokens.join(' ');
  const key = cacheKey('usda_ingredients', query);
  const cached = getCached(key);
  if (cached !== null) {
    return cached;
  }

  const product = await fetchUsdaProductByName(query);
  const value = product?.nutrition || null;
  setCached(key, value);
  return value;
}

export function isUsdaConfigured() {
  return hasKey();
}

export function clearUsdaCache() {
  cache.clear();
}
