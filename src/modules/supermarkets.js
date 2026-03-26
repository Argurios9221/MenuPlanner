import { getBasketIngredients } from './basket.js';
import { getPricesForStore } from './price-scraper.js';

const DEFAULT_COORDS = { lat: 42.6977, lon: 23.3219 }; // Sofia fallback (will be overridden by geolocation)
const OVERPASS_APIS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];
const MAX_PHYSICAL_STORES_FOR_COMPARISON = 12;
const OVERPASS_REQUEST_TIMEOUT_MS = 8000;
const ALLOWED_CHAIN_RULES = [
  { id: 'lidl', label: 'Lidl', regex: /(^|\W)lidl(\W|$)|лидл/iu },
  { id: 'kaufland', label: 'Kaufland', regex: /(^|\W)kaufland(\W|$)|кауфланд/iu },
  { id: 'billa', label: 'BILLA', regex: /(^|\W)billa(\W|$)|била/iu },
  { id: 'metro', label: 'Metro', regex: /(^|\W)metro(\W|$)|метро/iu },
  { id: 'fantastico', label: 'Fantastico', regex: /(^|\W)fantastico(\W|$)|фантастико/iu },
  { id: 'cba', label: 'CBA', regex: /(^|\W)cba(\W|$)|(^|\W)сба(\W|$)/iu },
  { id: '345', label: '345', regex: /(^|\W)345(\W|$)/iu },
  { id: 'dar', label: 'Dar', regex: /(^|\W)dar(\W|$)|(^|\W)дар(\W|$)/iu },
];
const ONLINE_GROCERY_STORES = [
  {
    id: 'online_ebag',
    chainId: 'ebag',
    chainLabel: 'eBag',
    name: 'eBag.bg',
    isOnline: true,
    offerUrl: 'https://www.ebag.bg',
  },
  {
    id: 'online_supermag',
    chainId: 'supermag',
    chainLabel: 'Supermag',
    name: 'Supermag',
    isOnline: true,
    offerUrl: 'https://shop.supermag.bg',
  },
  {
    id: 'online_glovo_market',
    chainId: 'glovo-market',
    chainLabel: 'Glovo Market',
    name: 'Glovo Market',
    isOnline: true,
    offerUrl: 'https://glovoapp.com/bg/bg/sofia/shops_1/',
  },
];
const FX_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
let fxCache = null;

// Generic fallback offers - realistic European supermarket prices
const FALLBACK_OFFERS = {
  generic: [
    { keyword: 'bread', title: 'Bread/Baguette', price: 1.40 },
    { keyword: 'milk', title: 'Milk 1L', price: 1.40 },
    { keyword: 'egg', title: 'Eggs 12-pack', price: 2.20 },
    { keyword: 'chicken', title: 'Chicken Breast', price: 4.50 },
    { keyword: 'pork', title: 'Pork Chop', price: 4.50 },
    { keyword: 'rice', title: 'Rice 1kg', price: 1.30 },
    { keyword: 'pasta', title: 'Pasta 500g', price: 1.00 },
    { keyword: 'cheese', title: 'Cheese 200g', price: 3.20 },
    { keyword: 'yogurt', title: 'Yogurt 500g', price: 1.20 },
    { keyword: 'butter', title: 'Butter 200g', price: 2.80 },
    { keyword: 'tomato', title: 'Tomatoes 1kg', price: 1.30 },
    { keyword: 'potato', title: 'Potatoes 1kg', price: 0.70 },
    { keyword: 'onion', title: 'Onions 500g', price: 0.60 },
    { keyword: 'carrot', title: 'Carrots 500g', price: 0.70 },
    { keyword: 'pepper', title: 'Bell Peppers', price: 1.30 },
    { keyword: 'apple', title: 'Apples 1kg', price: 1.50 },
    { keyword: 'banana', title: 'Bananas 500g', price: 1.10 },
    { keyword: 'orange', title: 'Oranges 1kg', price: 1.40 },
    { keyword: 'lemon', title: 'Lemons', price: 1.20 },
    { keyword: 'fish', title: 'White Fish Fillet', price: 6.00 },
    { keyword: 'oil', title: 'Cooking Oil 500ml', price: 2.80 },
    { keyword: 'sugar', title: 'Sugar 1kg', price: 1.20 },
    { keyword: 'flour', title: 'Flour 1kg', price: 1.10 },
  ],
};

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .trim();
}

const PANTRY_SKIP_PATTERN =
  /salt|pepper|water|olive oil|vegetable oil|vinegar|spice|seasoning|herb|bay leaf|paprika|cinnamon|nutmeg|sauce|soy sauce|mustard|ketchup|mayo|mayonnaise|baking powder|baking soda|yeast|rosemary|parsley|basil|oregano|thyme|dill/;

const INGREDIENT_ALIASES = {
  tomatoes: 'tomato',
  onions: 'onion',
  eggs: 'egg',
  potatoes: 'potato',
  carrots: 'carrot',
  cucumbers: 'cucumber',
  peppers: 'pepper',
  mushrooms: 'mushroom',
  apples: 'apple',
  bananas: 'banana',
  oranges: 'orange',
  lemons: 'lemon',
  yoghurts: 'yogurt',
  cheeses: 'cheese',
  pastas: 'pasta',
  oats: 'oat',
  beans: 'bean',
  chickpeas: 'chickpea',
  chickens: 'chicken',
  buns: 'bread',
  bun: 'bread',
  'burger bun': 'bread',
  'burger buns': 'bread',
  strawberries: 'strawberry',
  lentils: 'lentil',
  seafoods: 'seafood',
};

const COMMON_ASSORTMENT_PATTERN =
  /tomato|potato|onion|garlic|carrot|pepper|cucumber|mushroom|broccoli|zucchini|spinach|apple|banana|orange|lemon|strawberry|grapes|bread|bun|egg|milk|yogurt|cheese|butter|pasta|rice|flour|oil|sugar|bean|chickpea|lentil|chicken|beef|pork|lamb|fish|salmon|tuna|cod|seafood/;

function canonicalToken(value) {
  const raw = normalizeText(value)
    .replace(/[^a-zа-яё\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!raw) {
    return '';
  }

  if (/\bflour\b|брашн/.test(raw)) {
    return 'flour';
  }
  if (/\brice\b|basmati|jasmine|arborio|risotto\s+rice|long\s+grain\s+rice|short\s+grain\s+rice|brown\s+rice|ориз/.test(raw)) {
    return 'rice';
  }
  if (/\bpasta\b|spaghetti|penne|fusilli|macaroni|linguine|tagliatelle|farfalle|rigatoni|макарон|спагет|паста/.test(raw)) {
    return 'pasta';
  }
  if ((/\bmilk\b|мляко/.test(raw)) && !(/\bcoconut milk\b|\balmond milk\b|\bsoy milk\b|\boat milk\b|кокос|бадем|соево|овесено/.test(raw))) {
    return 'milk';
  }
  if (/\bgreen beans?\b|\bstring beans?\b|зелен\s+фасул/.test(raw)) {
    return 'green bean';
  }
  if (/\bharicot\b|\bcannellini\b|\bnavy bean\b|\bwhite bean\b|зрял\s+боб|бял\s+боб/.test(raw)) {
    return 'bean';
  }
  if (/\bchickpeas?\b|\bgarbanzo\b|нахут/.test(raw)) {
    return 'chickpea';
  }
  if (/\blentils?\b|леща/.test(raw)) {
    return 'lentil';
  }
  if (/\btomatoes?\b|\bcherry tomato\b|домат/.test(raw)) {
    return 'tomato';
  }
  if (/\bonions?\b|\bred onion\b|\bwhite onion\b|\byellow onion\b|лук/.test(raw)) {
    return 'onion';
  }
  if (/\bpotatoes?\b|картоф/.test(raw)) {
    return 'potato';
  }
  if (/\bcarrots?\b|морков/.test(raw)) {
    return 'carrot';
  }
  if (/\bcucumbers?\b|крастав/.test(raw)) {
    return 'cucumber';
  }
  if (/\bpeppers?\b|\bbell pepper\b|чуш/.test(raw)) {
    return 'pepper';
  }
  if (/\bmushrooms?\b|\bchampignon\b|гъб/.test(raw)) {
    return 'mushroom';
  }
  if (/\beggs?\b|яйц/.test(raw)) {
    return 'egg';
  }
  if (/\bchicken\b|пилешк|пиле/.test(raw)) {
    return 'chicken';
  }
  if (/\bbeef\b|телешк/.test(raw)) {
    return 'pork';  // Replace expensive beef with cheaper pork
  }
  if (/\bpork\b|свинск/.test(raw)) {
    return 'pork';
  }
  if (/\blamb\b|агнешк/.test(raw)) {
    return 'pork';  // Replace lamb with pork (cheaper)
  }
  if (/\bsalmon\b|сьомг/.test(raw)) {
    return 'fish';  // Replace expensive salmon with cheaper white fish
  }
  if (/\bcod\b|треск/.test(raw)) {
    return 'fish';
  }
  if (/\btuna\b|тон/.test(raw)) {
    return 'fish';
  }
  if (/\bapples?\b|ябълк/.test(raw)) {
    return 'apple';
  }
  if (/\bbananas?\b|банан/.test(raw)) {
    return 'banana';
  }
  if (/\boranges?\b|портокал/.test(raw)) {
    return 'orange';
  }
  if (/\blemons?\b|лимон/.test(raw)) {
    return 'lemon';
  }

  return INGREDIENT_ALIASES[raw] || raw;
}

function isPantryItem(value) {
  return PANTRY_SKIP_PATTERN.test(normalizeText(value));
}

function ingredientMatchesOffer(ingredient, offerKeyword) {
  const ingredientToken = canonicalToken(ingredient);
  const keywordToken = canonicalToken(offerKeyword);
  if (!ingredientToken || !keywordToken) {
    return false;
  }

  // Do not map green beans to generic dry-bean offers.
  if (
    (ingredientToken === 'green bean' && keywordToken === 'bean') ||
    (ingredientToken === 'bean' && keywordToken === 'green bean')
  ) {
    return false;
  }

  return ingredientToken === keywordToken;
}

function isLikelyAvailableInStore(ingredient) {
  const token = canonicalToken(ingredient);
  if (!token) {
    return false;
  }
  return COMMON_ASSORTMENT_PATTERN.test(token);
}

function haversineKm(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);

  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function resolveAllowedChain(name, brand, operator) {
  const haystack = `${name || ''} ${brand || ''} ${operator || ''}`.toLowerCase();
  for (const rule of ALLOWED_CHAIN_RULES) {
    if (rule.regex.test(haystack)) {
      return { chainId: rule.id, chainLabel: rule.label };
    }
  }
  return null;
}

function parseOverpassElement(el) {
  const lat = el.lat || el.center?.lat;
  const lon = el.lon || el.center?.lon;
  if (typeof lat !== 'number' || typeof lon !== 'number') {
    return null;
  }

  const brand = el.tags?.brand || '';
  const operator = el.tags?.operator || '';
  const name = el.tags?.name || brand || operator || '';
  const allowed = resolveAllowedChain(name, brand, operator);
  if (!allowed) {
    return null;
  }

  const result = {
    id: `store_${el.id}`,
    chainId: allowed.chainId,
    chainLabel: allowed.chainLabel,
    name: name || allowed.chainLabel,
    lat,
    lon,
    address: [el.tags?.['addr:street'], el.tags?.['addr:housenumber']].filter(Boolean).join(' '),
  };

  console.log('🏪 [Parse] Element ID:', el.id, '→', result);

  return result;
}

function dedupeStoreKey(store) {
  // For real stores from Overpass, deduplicate based on coordinates + name
  // (Overpass can return same physical store as node/way/relation)
  const roundedLat = Number(store.lat).toFixed(4);
  const roundedLon = Number(store.lon).toFixed(4);
  const name = normalizeText(store.name || store.chainLabel || '');
  return `${roundedLat}:${roundedLon}:${name}`;
}

async function getUserCoords() {
  // Check if geolocation is available
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return { ...DEFAULT_COORDS, isFallback: true };
  }

  try {
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 60000,
      });
    });

    return {
      lat: position.coords.latitude,
      lon: position.coords.longitude,
      isFallback: false,
    };
  } catch {
    return { ...DEFAULT_COORDS, isFallback: true };
  }
}

async function fetchNearbyChains(coords, options = {}) {
  const { useFallbackOnly = false } = options;

  if (useFallbackOnly) {
    return [];
  }

  console.log('🏪 [Supermarkets] Fetching nearby stores. Coords:', coords);

  // Only allowed supermarket/hypermarket/grocery chains.
  const query = `
    [out:json][timeout:8];
    (
      node["shop"~"supermarket|hypermarket|grocery",i][~"^(name|brand|operator)$"~"lidl|лидл|kaufland|кауфланд|billa|била|metro|метро|fantastico|фантастико|cba|сба|345|dar|дар",i](around:7000,${coords.lat},${coords.lon});
      way["shop"~"supermarket|hypermarket|grocery",i][~"^(name|brand|operator)$"~"lidl|лидл|kaufland|кауфланд|billa|била|metro|метро|fantastico|фантастико|cba|сба|345|dar|дар",i](around:7000,${coords.lat},${coords.lon});
      relation["shop"~"supermarket|hypermarket|grocery",i][~"^(name|brand|operator)$"~"lidl|лидл|kaufland|кауфланд|billa|била|metro|метро|fantastico|фантастико|cba|сба|345|dar|дар",i](around:7000,${coords.lat},${coords.lon});
    );
    out center tags;
  `;

  try {
    const parsed = await fetchFromOverpassMirrors(query);
    console.log('🏪 [Supermarkets] Parsed stores from Overpass:', parsed.length, parsed.map(s => ({ id: s.id, name: s.name, chainLabel: s.chainLabel, lat: s.lat, lon: s.lon })));

    const candidates = parsed;

    const deduped = new Map();
    for (const store of candidates) {
      const key = dedupeStoreKey(store);
      if (!deduped.has(key)) {
        deduped.set(key, store);
      }
    }

    const result = Array.from(deduped.values());
    console.log('🏪 [Supermarkets] Deduped stores:', result.length, result.map(s => ({ name: s.name, chainLabel: s.chainLabel, key: dedupeStoreKey(s) })));

    // Strict mode: return only allowed real chains.
    const finalResult = result;

    console.log('🏪 [Supermarkets] Final result:', finalResult.length, 'stores');
    return finalResult;
  } catch (err) {
    console.error('🏪 [Supermarkets] Overpass API error:', err);
    return [];
  }
}

async function fetchFromOverpassMirrors(query) {
  for (const endpoint of OVERPASS_APIS) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), OVERPASS_REQUEST_TIMEOUT_MS);
      const response = await fetch(endpoint, {
        method: 'POST',
        body: query,
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!response.ok) {
        console.warn('🏪 [Supermarkets] Overpass mirror failed:', endpoint, response.status);
        continue;
      }

      const data = await response.json();
      const parsed = (data.elements || []).map(parseOverpassElement).filter(Boolean);
      console.log('🏪 [Supermarkets] Overpass mirror raw elements:', endpoint, data.elements?.length || 0, 'parsed allowed:', parsed.length);
      if (parsed.length > 0) {
        return parsed;
      }
    } catch (error) {
      console.warn('🏪 [Supermarkets] Overpass mirror error:', endpoint, error?.message || error);
    }
  }

  return [];
}

async function getFxRates() {
  if (fxCache && Date.now() - fxCache.ts < FX_CACHE_TTL_MS) {
    return fxCache.value;
  }

  try {
    const response = await fetch('https://open.er-api.com/v6/latest/EUR');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const eurToBgn = Number(data?.rates?.BGN || 1.9558);
    const rates = { base: 'EUR', EUR: 1, BGN: eurToBgn };
    fxCache = { ts: Date.now(), value: rates };
    return rates;
  } catch {
    const fallback = { base: 'EUR', EUR: 1, BGN: 1.9558 };
    fxCache = { ts: Date.now(), value: fallback };
    return fallback;
  }
}

async function getChainOffers(storeId, chainLabel, ingredientNames, options = {}) {
  const { useFallbackOnly = false } = options;

  if (useFallbackOnly) {
    return FALLBACK_OFFERS.generic || [];
  }

  // Try to get real prices from scraper database
  let offers = getPricesForStore(storeId, chainLabel, ingredientNames);

  // If no offers found for this store, use generic fallback
  if (!offers || offers.length === 0) {
    console.log(`🛒 [Supermarkets] No scraped prices found for ${chainLabel}, using fallback`);
    offers = FALLBACK_OFFERS['generic'] || [];
  }
  return offers;
}

// Parse package size from offer title (e.g. "Butter 125g" → 125, "Rice 1kg" → 1000)
function parsePackageSizeGrams(title) {
  const m = String(title || '').match(/(\d+(?:[.,]\d+)?)\s*(g|gr|kg|ml|l)\b/i);
  if (!m) {
    return null;
  }
  const amount = parseFloat(m[1].replace(',', '.'));
  const unit = m[2].toLowerCase();
  if (unit === 'kg' || unit === 'l') {
    return amount * 1000;
  }
  if (unit === 'ml') {
    return amount;
  }
  return amount; // g/gr
}

const DEFAULT_PACKAGE_SIZE_G = 500;

function getCoverage(offers, ingredientItems) {
  // Accept plain string array or {name, totalGrams, count} array
  const items = (ingredientItems || []).map((item) =>
    typeof item === 'string' ? { name: item, totalGrams: 0, count: 1 } : item,
  );

  const offerMatchedNames = new Set();
  const promoMatchedNames = new Set();
  const assortmentMatchedNames = new Set();
  const pricedNames = new Set();
  const matchedOffers = [];
  const unmatchedItems = [];
  let estimatedTotal = 0;
  let pricedItemsCount = 0;

  const relevantItems = items.filter((item) => !isPantryItem(item.name));

  for (const item of relevantItems) {
    const normalizedName = normalizeText(item.name);
    let foundOffer = null;
    for (const offer of offers) {
      if (ingredientMatchesOffer(normalizedName, offer.keyword)) {
        foundOffer = offer;
        break;
      }
    }

    if (foundOffer) {
      offerMatchedNames.add(normalizedName);
      matchedOffers.push({ ingredient: item.name, offer: foundOffer });
      if (foundOffer.price !== null && !pricedNames.has(normalizedName)) {
        pricedNames.add(normalizedName);
        pricedItemsCount++;
        // Only count offer if has discount
        if (foundOffer.discountPercent !== undefined && foundOffer.discountPercent > 0) {
          promoMatchedNames.add(normalizedName);
        }
        const pkgSizeG = parsePackageSizeGrams(foundOffer.title) || DEFAULT_PACKAGE_SIZE_G;
        const packagesNeeded = item.totalGrams > 0
          ? Math.max(1, Math.ceil(item.totalGrams / pkgSizeG))
          : (item.count >= 2 ? item.count : 1);
        estimatedTotal += foundOffer.price * packagesNeeded;
      }
    } else if (isLikelyAvailableInStore(normalizedName)) {
      assortmentMatchedNames.add(normalizedName);
    } else {
      unmatchedItems.push(item.name);
    }
  }

  const total = relevantItems.length;
  // Offer-based % — only counted as matched if offer available
  const offerPercent = total > 0 ? Math.round((offerMatchedNames.size / total) * 100) : 0;
  // Promo % — items with known prices and discounts
  const promoPercent = total > 0 ? Math.round((promoMatchedNames.size / total) * 100) : 0;
  // Estimated % including common assortment (optimistic upper bound)
  const estimatedPercent = total > 0
    ? Math.round(((offerMatchedNames.size + assortmentMatchedNames.size) / total) * 100)
    : 0;

  return {
    matchedCount: offerMatchedNames.size,
    pricedCount: pricedItemsCount,
    promoMatchedCount: promoMatchedNames.size,
    total,
    percent: offerPercent,
    estimatedPercent,
    promoPercent,
    estimatedTotal: Number(estimatedTotal.toFixed(2)),
    matchedOffers,
    unmatchedItems,
  };
}

function makeDirectionsUrl(store, originCoords) {
  if (store.isOnline || store.isFallback) {
    return '';
  }

  const destinationCoords = `${Number(store.lat).toFixed(6)},${Number(store.lon).toFixed(6)}`;
  const destination = encodeURIComponent(destinationCoords);
  const origin = originCoords && !originCoords.isFallback
    ? `&origin=${encodeURIComponent(`${originCoords.lat},${originCoords.lon}`)}`
    : '';
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}${origin}&travelmode=driving`;
}

export async function buildSupermarketRecommendations(basket) {
  const options = arguments[1] || {};
  const {
    minRecommendedCoverage = 70,
    forceFallbackCoords = false,
    useFallbackOnly = false,
  } = options;

  console.log('🏪 [Supermarkets] Building recommendations. Options:', { minRecommendedCoverage, forceFallbackCoords, useFallbackOnly });

  const allBasketIngredients = getBasketIngredients(basket);
  const ingredientByCanonical = new Map();
  for (const item of allBasketIngredients) {
    const canonical = canonicalToken(item.name);
    if (!canonical) {
      continue;
    }
    const current = ingredientByCanonical.get(canonical);
    if (!current) {
      ingredientByCanonical.set(canonical, {
        name: canonical === 'flour' ? 'Flour' : item.name,
        totalGrams: item.totalGrams || 0,
        count: item.count || 1,
      });
      continue;
    }
    current.totalGrams += item.totalGrams || 0;
    current.count += item.count || 1;
  }
  const ingredientItems = Array.from(ingredientByCanonical.values());
  const ingredientNames = ingredientItems.map((i) => i.name);
  console.log('🏪 [Supermarkets] Basket ingredients:', ingredientNames.length, 'items');

  const coords = forceFallbackCoords
    ? { ...DEFAULT_COORDS, isFallback: true }
    : await getUserCoords();
  console.log('🏪 [Supermarkets] User coords:', coords.isFallback ? '(fallback) ' + JSON.stringify(coords) : JSON.stringify(coords));

  const shouldUseFallbackOnly = useFallbackOnly || forceFallbackCoords;
  const nearbyStores = await fetchNearbyChains(coords, { useFallbackOnly: shouldUseFallbackOnly });
  const limitedNearbyStores = [...nearbyStores]
    .sort((a, b) => haversineKm(coords, { lat: a.lat, lon: a.lon }) - haversineKm(coords, { lat: b.lat, lon: b.lon }))
    .slice(0, MAX_PHYSICAL_STORES_FOR_COMPARISON);
  const onlineStores = ONLINE_GROCERY_STORES.map((store) => ({
    ...store,
    lat: coords.lat,
    lon: coords.lon,
    address: 'Online',
  }));
  const allStores = [...limitedNearbyStores, ...onlineStores];
  console.log('🏪 [Supermarkets] Nearby stores from fetchNearbyChains:', nearbyStores.length, 'limited to:', limitedNearbyStores.length, 'online stores:', onlineStores.length);

  const fx = await getFxRates();

  // Fetch offers for all nearby stores
  console.log('🏪 [Supermarkets] Fetching offers for', allStores.length, 'stores...');
  const offerEntries = await Promise.all(
    allStores.map(async (store) => {
      const offers = await getChainOffers(store.id, store.chainLabel, ingredientNames, {
        useFallbackOnly: shouldUseFallbackOnly,
      });
      return [store.id, offers];
    }),
  );
  const offersByStore = Object.fromEntries(offerEntries);

  const enriched = allStores.map((store) => {
    const offers = offersByStore[store.id] || [];
    const coverage = getCoverage(offers, ingredientItems);
    const distanceKm = store.isOnline ? null : haversineKm(coords, { lat: store.lat, lon: store.lon });
    const distancePenalty = distanceKm !== null ? distanceKm * 1.5 : 4.5;
    const onlinePenalty = store.isOnline ? 2 : 0;
    const score = coverage.percent * 1.2 + coverage.matchedCount * 2 - distancePenalty - onlinePenalty;

    return {
      ...store,
      id: store.id || `store_${Math.random()}`,
      offers,
      coverage,
      distanceKm: distanceKm !== null ? Number(distanceKm.toFixed(2)) : null,
      score,
      directionsUrl: makeDirectionsUrl(store, coords),
      offerUrl: store.offerUrl || '',
    };
  });

  const byScore = [...enriched].sort((a, b) => b.score - a.score);
  const physicalSorted = byScore.filter((store) => !store.isOnline);
  const recommended =
    physicalSorted.find((store) => store.coverage.percent >= minRecommendedCoverage) ||
    physicalSorted[0] ||
    byScore[0] ||
    null;
  const bestCoveragePercent = byScore[0]?.coverage?.percent || 0;

  const orderedStores = byScore.sort((a, b) => {
    if (b.coverage.percent !== a.coverage.percent) {
      return b.coverage.percent - a.coverage.percent;
    }
    const aDist = a.distanceKm ?? Number.POSITIVE_INFINITY;
    const bDist = b.distanceKm ?? Number.POSITIVE_INFINITY;
    return aDist - bDist;
  });

  console.log('🏪 [Supermarkets] Final result:', orderedStores.length, 'stores. Recommended:', recommended?.name);

  return {
    coords,
    recommendedStoreId: recommended?.id || null,
    minRecommendedCoverage,
    bestCoveragePercent,
    fx,
    stores: orderedStores,
  };
}
