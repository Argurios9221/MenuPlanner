import { isSpoonacularEnabled } from './spoonacular.js';
import { fetchUsdaProductByName, isUsdaConfigured } from './usda.js';

const CLOUDE_ANALYZER_URL = import.meta.env.VITE_CLOUDE_ANALYZER_URL || '';

function withTimeout(promise, timeoutMs = 2200) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(null), timeoutMs)),
  ]);
}

async function pingJson(url) {
  try {
    const response = await withTimeout(fetch(url));
    if (!response || !response.ok) {
      return false;
    }
    await response.json().catch(() => ({}));
    return true;
  } catch {
    return false;
  }
}

async function checkOpenFoodFacts() {
  return pingJson('https://world.openfoodfacts.org/api/v2/product/5449000000996.json');
}

async function checkOpenVerse() {
  return pingJson('https://api.openverse.org/v1/images/?q=tomato&page_size=1&mature=false');
}

async function checkSampleApis() {
  return pingJson('https://api.sampleapis.com/recipes/recipes');
}

async function checkMyMemory() {
  return pingJson('https://api.mymemory.translated.net/get?q=hello&langpair=en|bg');
}

async function checkUsda() {
  if (!isUsdaConfigured()) {
    return false;
  }
  const result = await fetchUsdaProductByName('apple');
  return Boolean(result?.description || result?.nutrition);
}

export async function getApiConnectionStatuses() {
  const checks = await Promise.all([
    Promise.resolve(isSpoonacularEnabled()),
    checkUsda(),
    checkOpenFoodFacts(),
    checkOpenVerse(),
    checkSampleApis(),
    checkMyMemory(),
  ]);

  return {
    spoonacular: checks[0],
    usda: checks[1],
    openfoodfacts: checks[2],
    openverse: checks[3],
    sampleapis: checks[4],
    mymemory: checks[5],
    cloude: Boolean(String(CLOUDE_ANALYZER_URL).trim()),
    themealdb: true,
  };
}
