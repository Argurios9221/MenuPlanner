/**
 * Price Scraper Module
 * Fetches product prices from Bulgarian supermarket websites
 * Caches results for 24 hours
 */

const PRICE_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const priceCache = new Map();

// Manual price database for Bulgarian chains (updated manually as fallback)
const MANUAL_PRICE_DB = {
  lidl: {
    name: 'Lidl',
    url: 'https://www.lidl.bg',
    prices: {
      bread: 1.49,
      milk: 1.29,
      egg: 2.49,
      chicken: 5.99,
      pork: 4.99,
      rice: 1.39,
      pasta: 0.99,
      cheese: 3.49,
      yogurt: 1.19,
      butter: 3.29,
      tomato: 1.39,
      potato: 0.79,
      onion: 0.69,
      carrot: 0.79,
      pepper: 1.49,
      apple: 1.79,
      banana: 1.29,
      orange: 1.49,
      lemon: 1.39,
      fish: 6.99,
      oil: 2.99,
      sugar: 1.29,
      flour: 1.19,
    },
  },
  kaufland: {
    name: 'Kaufland',
    url: 'https://www.kaufland.bg',
    prices: {
      bread: 1.39,
      milk: 1.39,
      egg: 2.19,
      chicken: 5.49,
      pork: 4.79,
      rice: 1.29,
      pasta: 1.09,
      cheese: 3.29,
      yogurt: 1.29,
      butter: 3.19,
      tomato: 1.29,
      potato: 0.69,
      onion: 0.59,
      carrot: 0.69,
      pepper: 1.39,
      apple: 1.69,
      banana: 1.19,
      orange: 1.39,
      lemon: 1.29,
      fish: 6.49,
      oil: 2.89,
      sugar: 1.19,
      flour: 1.09,
    },
  },
  billa: {
    name: 'BILLA',
    url: 'https://www.billa.bg',
    prices: {
      bread: 1.59,
      milk: 1.49,
      egg: 2.69,
      chicken: 5.99,
      pork: 5.29,
      rice: 1.49,
      pasta: 1.19,
      cheese: 3.69,
      yogurt: 1.39,
      butter: 3.49,
      tomato: 1.49,
      potato: 0.89,
      onion: 0.79,
      carrot: 0.89,
      pepper: 1.59,
      apple: 1.99,
      banana: 1.39,
      orange: 1.59,
      lemon: 1.49,
      fish: 7.49,
      oil: 3.19,
      sugar: 1.39,
      flour: 1.29,
    },
  },
};

/**
 * Build store-specific price offers
 * @param {string} storeId - Store ID (store_XXX)
 * @param {string} chainLabel - Chain label (Lidl, Kaufland, BILLA)
 * @param {array} ingredients - Ingredient names to get prices for
 * @returns {array} Array of offer objects with prices
 */
export function getPricesForStore(storeId, chainLabel, ingredients = []) {
  const chainKey = chainLabel.toLowerCase();
  const chainData = MANUAL_PRICE_DB[chainKey];

  if (!chainData) {
    console.warn(`🛒 [PriceScraper] No price data for chain: ${chainLabel}`);
    return [];
  }

  const offers = [];
  for (const ingredient of ingredients) {
    const normalized = normalizeIngredient(ingredient);
    const price = chainData.prices[normalized];

    if (price) {
      offers.push({
        keyword: normalized,
        title: ingredient,
        price,
        source: chainLabel,
        sourceType: 'manual_db',
        scraped: false,
      });
    }
  }

  console.log(`🛒 [PriceScraper] Found ${offers.length} prices for ${chainLabel}`);
  return offers;
}

/**
 * Normalize ingredient name for price lookup
 */
function normalizeIngredient(ingredient) {
  const normalized = String(ingredient || '')
    .toLowerCase()
    .trim();

  // Map common ingredient variations to database keys
  const mapping = {
    'chicken breast': 'chicken',
    'pork chop': 'pork',
    'white fish fillet': 'fish',
    'fish fillet': 'fish',
    'cooking oil': 'oil',
    'olive oil': 'oil',
    'vegetable oil': 'oil',
    'bread/baguette': 'bread',
    'baguette': 'bread',
    'eggs': 'egg',
    'eggs 12-pack': 'egg',
    'milk 1l': 'milk',
    'tomatoes': 'tomato',
    'potatoes': 'potato',
    'onions': 'onion',
    'carrots': 'carrot',
    'peppers': 'pepper',
    'bell peppers': 'pepper',
    'apples': 'apple',
    'bananas': 'banana',
    'oranges': 'orange',
    'lemons': 'lemon',
  };

  return mapping[normalized] || normalized;
}

/**
 * Get all available chains with pricing
 */
export function getAvailableChains() {
  return Object.values(MANUAL_PRICE_DB).map((chain) => ({
    id: chain.name.toLowerCase(),
    name: chain.name,
    url: chain.url,
    priceCount: Object.keys(chain.prices).length,
  }));
}

/**
 * Update price data (for manual updates)
 * @param {string} chainKey - Chain key (lidl, kaufland, billa)
 * @param {object} priceUpdates - Object with keyword: price pairs
 */
export function updateChainPrices(chainKey, priceUpdates) {
  const chain = MANUAL_PRICE_DB[chainKey.toLowerCase()];
  if (!chain) {
    console.error(`🛒 [PriceScraper] Unknown chain: ${chainKey}`);
    return false;
  }

  Object.assign(chain.prices, priceUpdates);
  console.log(`🛒 [PriceScraper] Updated prices for ${chain.name}`, priceUpdates);
  return true;
}

/**
 * Export current price data as JSON (for backup/import)
 */
export function exportPriceData() {
  return JSON.stringify(MANUAL_PRICE_DB, null, 2);
}

/**
 * Import price data from JSON
 */
export function importPriceData(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    Object.assign(MANUAL_PRICE_DB, data);
    console.log('🛒 [PriceScraper] Imported price data');
    return true;
  } catch (err) {
    console.error('🛒 [PriceScraper] Failed to import price data:', err);
    return false;
  }
}
