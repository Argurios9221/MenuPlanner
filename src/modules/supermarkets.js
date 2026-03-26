import { getBasketIngredients } from './basket.js';
import { getPricesForStore } from './price-scraper.js';

const DEFAULT_COORDS = { lat: 42.6977, lon: 23.3219 }; // Sofia fallback (will be overridden by geolocation)
const OVERPASS_APIS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];
const SEARCH_RADIUS_METERS = 15000;
const MAX_PHYSICAL_STORES_FOR_COMPARISON = 24;
const OVERPASS_REQUEST_TIMEOUT_MS = 8000;
const SHOP_TAG_PATTERN = 'supermarket|hypermarket|grocery|convenience|wholesale';
const ALLOWED_CHAIN_RULES = [
  { id: 'lidl', label: 'Lidl', regex: /(^|\W)lidl(\W|$)|лидл/iu },
  { id: 'kaufland', label: 'Kaufland', regex: /(^|\W)kaufland(\W|$)|кауфланд/iu },
  { id: 'billa', label: 'BILLA', regex: /(^|\W)billa(\W|$)|била/iu },
  { id: 'metro', label: 'Metro', regex: /(^|\W)metro(\W|$)|метро/iu },
  { id: 'fantastico', label: 'Fantastico', regex: /(^|\W)fantastico(\W|$)|фантастико/iu },
  { id: 't-market', label: 'T-Market', regex: /(^|\W)t[\s-]?market(\W|$)|т[\s-]?маркет/iu },
  { id: 'cba', label: 'CBA', regex: /(^|\W)cba(\W|$)|(^|\W)сба(\W|$)/iu },
  { id: '345', label: '345', regex: /(^|\W)345(\W|$)/iu },
  { id: 'fresco', label: 'FRESCO', regex: /(^|\W)fresco(\W|$)|фреско/iu },
  { id: 'dar', label: 'Dar', regex: /(^|\W)dar(\W|$)|(^|\W)дар(\W|$)/iu },
];
const TARGET_CHAIN_IDS = new Set(['lidl', 'fantastico', 'kaufland', 'metro', '345', 'ebag', 'supermag']);
const TARGET_PHYSICAL_CHAIN_IDS = new Set(['lidl', 'fantastico', 'kaufland', 'metro', '345']);
const CLOUDE_ANALYZER_URL = import.meta.env.VITE_CLOUDE_ANALYZER_URL || '';
const CLOUDE_ANALYZER_KEY = import.meta.env.VITE_CLOUDE_ANALYZER_KEY || '';
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
    { keyword: 'bread', title: 'Bread/Baguette', price: 1.40, sourceType: 'fallback_estimate' },
    { keyword: 'milk', title: 'Milk 1L', price: 1.40, sourceType: 'fallback_estimate' },
    { keyword: 'egg', title: 'Eggs 12-pack', price: 2.20, sourceType: 'fallback_estimate' },
    { keyword: 'chicken', title: 'Chicken Breast', price: 4.50, sourceType: 'fallback_estimate' },
    { keyword: 'pork', title: 'Pork Chop', price: 4.50, sourceType: 'fallback_estimate' },
    { keyword: 'rice', title: 'Rice 1kg', price: 1.30, sourceType: 'fallback_estimate' },
    { keyword: 'pasta', title: 'Pasta 500g', price: 1.00, sourceType: 'fallback_estimate' },
    { keyword: 'cheese', title: 'Cheese 200g', price: 3.20, sourceType: 'fallback_estimate' },
    { keyword: 'yogurt', title: 'Yogurt 500g', price: 1.20, sourceType: 'fallback_estimate' },
    { keyword: 'butter', title: 'Butter 200g', price: 2.80, sourceType: 'fallback_estimate' },
    { keyword: 'tomato', title: 'Tomatoes 1kg', price: 1.30, sourceType: 'fallback_estimate' },
    { keyword: 'potato', title: 'Potatoes 1kg', price: 0.70, sourceType: 'fallback_estimate' },
    { keyword: 'onion', title: 'Onions 500g', price: 0.60, sourceType: 'fallback_estimate' },
    { keyword: 'carrot', title: 'Carrots 500g', price: 0.70, sourceType: 'fallback_estimate' },
    { keyword: 'pepper', title: 'Bell Peppers', price: 1.30, sourceType: 'fallback_estimate' },
    { keyword: 'apple', title: 'Apples 1kg', price: 1.50, sourceType: 'fallback_estimate' },
    { keyword: 'banana', title: 'Bananas 500g', price: 1.10, sourceType: 'fallback_estimate' },
    { keyword: 'orange', title: 'Oranges 1kg', price: 1.40, sourceType: 'fallback_estimate' },
    { keyword: 'lemon', title: 'Lemons', price: 1.20, sourceType: 'fallback_estimate' },
    { keyword: 'fish', title: 'White Fish Fillet', price: 6.00, sourceType: 'fallback_estimate' },
    { keyword: 'oil', title: 'Cooking Oil 500ml', price: 2.80, sourceType: 'fallback_estimate' },
    { keyword: 'sugar', title: 'Sugar 1kg', price: 1.20, sourceType: 'fallback_estimate' },
    { keyword: 'flour', title: 'Flour 1kg', price: 1.10, sourceType: 'fallback_estimate' },
  ],
};

const CHAIN_FALLBACK_MULTIPLIERS = {
  lidl: 0.98,
  kaufland: 0.97,
  billa: 1.05,
  metro: 1.01,
  fantastico: 1.04,
  't-market': 0.99,
  cba: 1.03,
  '345': 1.0,
  fresco: 1.02,
  dar: 1.01,
  ebag: 1.06,
  supermag: 1.05,
  'glovo-market': 1.08,
};

const SMART_BUDGET_SWAPS = [
  { from: 'beef', to: 'pork', fromLabel: 'beef', toLabel: 'pork' },
  { from: 'lamb', to: 'chicken', fromLabel: 'lamb', toLabel: 'chicken' },
  { from: 'salmon', to: 'fish', fromLabel: 'salmon', toLabel: 'white fish' },
];

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .trim();
}

function hashString(value) {
  let hash = 0;
  const text = String(value || '');
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getChainFallbackOffers(chainId, chainLabel) {
  const chainKey = normalizeText(chainId || chainLabel).replace(/\s+/g, '-');
  const multiplier = CHAIN_FALLBACK_MULTIPLIERS[chainKey] || 1;

  return (FALLBACK_OFFERS.generic || []).map((offer) => {
    const seed = hashString(`${chainKey}:${offer.keyword}`);
    const promoApplied = seed % 7 === 0;
    const promoPercent = promoApplied ? 8 + (seed % 13) : 0;
    const basePrice = Number(offer.price || 0);
    const chainAdjusted = basePrice * multiplier;
    const finalPrice = promoPercent > 0
      ? chainAdjusted * (1 - promoPercent / 100)
      : chainAdjusted;

    return {
      ...offer,
      title: `${offer.title} (${chainLabel})`,
      price: Number(finalPrice.toFixed(2)),
      discountPercent: promoPercent,
      sourceType: 'fallback_estimate',
    };
  });
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

function getFamilyDietaryReplacementRules(exclusion) {
  const rules = {
    lactose_free: [
      { pattern: /milk|cream|cheese|butter|yogurt|yoghurt/i, to: 'oat milk' },
    ],
    no_pork: [
      { pattern: /pork|bacon|ham/i, to: 'chicken' },
    ],
    no_beef: [
      { pattern: /beef|veal/i, to: 'chicken' },
    ],
    no_chicken: [
      { pattern: /chicken|hen/i, to: 'fish' },
    ],
    no_seafood: [
      { pattern: /fish|seafood|salmon|tuna|cod|shrimp|prawn|crab|lobster/i, to: 'chicken' },
    ],
    gluten_free: [
      { pattern: /flour|pasta|bread|noodle|breadcrumbs|barley|rye|semolina|couscous/i, to: 'rice' },
    ],
  };
  return rules[exclusion] || [];
}

function resolveFamilyAdjustedIngredientName(name, familyProfiles = []) {
  const sourceName = String(name || '').trim();
  if (!sourceName || !familyProfiles.length) {
    return sourceName;
  }

  const sourceToken = normalizeText(sourceName);
  let adjustedName = sourceName;

  // Explicit profile replacements take priority over generic exclusion rules.
  for (const profile of familyProfiles) {
    for (const replacement of profile?.replacements || []) {
      const fromToken = normalizeText(replacement?.from || '');
      const toToken = String(replacement?.to || '').trim();
      if (!fromToken || !toToken) {
        continue;
      }
      if (sourceToken.includes(fromToken) || fromToken.includes(sourceToken)) {
        adjustedName = toToken;
      }
    }
  }

  for (const profile of familyProfiles) {
    for (const exclusion of profile?.exclusions || []) {
      const rules = getFamilyDietaryReplacementRules(exclusion);
      for (const rule of rules) {
        if (rule.pattern.test(adjustedName)) {
          adjustedName = rule.to;
        }
      }
    }
  }

  return adjustedName;
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
      if (!TARGET_CHAIN_IDS.has(rule.id)) {
        return null;
      }
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

  const brand = el.tags?.brand || el.tags?.['brand:en'] || '';
  const operator = el.tags?.operator || '';
  const shortName = el.tags?.short_name || '';
  const officialName = el.tags?.official_name || el.tags?.['name:en'] || el.tags?.alt_name || '';
  const name = el.tags?.name || brand || operator || shortName || officialName || '';
  const allowed = resolveAllowedChain(
    `${name} ${shortName} ${officialName}`,
    brand,
    operator,
  );
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

  return result;
}

function limitStoresForComparison(stores, coords) {
  const sorted = [...stores].sort(
    (a, b) => haversineKm(coords, { lat: a.lat, lon: a.lon }) - haversineKm(coords, { lat: b.lat, lon: b.lon }),
  );
  const perChainCounts = new Map();
  const selected = [];

  for (const store of sorted) {
    const chainKey = store.chainId || store.chainLabel || store.id;
    const currentCount = perChainCounts.get(chainKey) || 0;
    if (currentCount >= 3) {
      continue;
    }
    selected.push(store);
    perChainCounts.set(chainKey, currentCount + 1);
    if (selected.length >= MAX_PHYSICAL_STORES_FOR_COMPARISON) {
      break;
    }
  }

  return selected;
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

  const buildQuery = (radiusMeters) => `
    [out:json][timeout:8];
    (
      node["shop"~"${SHOP_TAG_PATTERN}",i](around:${radiusMeters},${coords.lat},${coords.lon});
      way["shop"~"${SHOP_TAG_PATTERN}",i](around:${radiusMeters},${coords.lat},${coords.lon});
      relation["shop"~"${SHOP_TAG_PATTERN}",i](around:${radiusMeters},${coords.lat},${coords.lon});
    );
    out center tags;
  `;

  try {
    const candidates = await fetchFromOverpassMirrors(buildQuery(SEARCH_RADIUS_METERS));

    const deduped = new Map();
    for (const store of candidates) {
      const key = dedupeStoreKey(store);
      if (!deduped.has(key)) {
        deduped.set(key, store);
      }
    }

    const result = Array.from(deduped.values());
    // Strict mode: return only allowed real chains.
    const finalResult = result;

    return finalResult;
  } catch (err) {
    console.error('🏪 [Supermarkets] Overpass API error:', err);
    return [];
  }
}

function normalizeCloudeCoverage(rawCoverage, fallbackCoverage, ingredientItems) {
  const fallback = fallbackCoverage || {};
  const total = Number(rawCoverage?.total || fallback.total || ingredientItems.length || 0);
  const matchedCount = Number(rawCoverage?.matchedCount || fallback.matchedCount || 0);
  const promoMatchedCount = Number(rawCoverage?.promoMatchedCount || fallback.promoMatchedCount || 0);
  const pricedCount = Number(rawCoverage?.pricedCount || fallback.pricedCount || matchedCount);
  const percent = Number.isFinite(rawCoverage?.percent)
    ? Number(rawCoverage.percent)
    : (total > 0 ? Math.round((matchedCount / total) * 100) : Number(fallback.percent || 0));
  const promoPercent = Number.isFinite(rawCoverage?.promoPercent)
    ? Number(rawCoverage.promoPercent)
    : (total > 0 ? Math.round((promoMatchedCount / total) * 100) : Number(fallback.promoPercent || 0));
  const estimatedPercent = Number.isFinite(rawCoverage?.estimatedPercent)
    ? Number(rawCoverage.estimatedPercent)
    : percent;
  const estimatedTotal = Number.isFinite(rawCoverage?.estimatedTotal)
    ? Number(rawCoverage.estimatedTotal)
    : Number(fallback.estimatedTotal || 0);

  const rawMatched = rawCoverage?.matchedOffers || [];
  const matchedOffers = rawMatched
    .map((entry) => {
      const ingredient = String(entry?.ingredient || '').trim();
      const title = String(entry?.title || entry?.offer?.title || '').trim();
      if (!ingredient || !title) {
        return null;
      }
      const price = Number(entry?.price ?? entry?.offer?.price);
      const sourceType = String(entry?.sourceType || entry?.offer?.sourceType || 'cloude_estimate');
      const confidenceLevel = String(entry?.confidenceLevel || entry?.offer?.confidenceLevel || 'low');
      const confidenceReason = String(entry?.confidenceReason || entry?.offer?.confidenceReason || 'Estimated market price');
      return {
        ingredient,
        offer: {
          title,
          keyword: canonicalToken(ingredient),
          price: Number.isFinite(price) ? price : null,
          discountPercent: Number((entry?.discountPercent ?? entry?.offer?.discountPercent) || 0),
          sourceType,
          confidenceLevel,
          confidenceReason,
        },
      };
    })
    .filter(Boolean);

  const unmatchedItems = Array.isArray(rawCoverage?.unmatchedItems)
    ? rawCoverage.unmatchedItems.map((item) => String(item || '').trim()).filter(Boolean)
    : (fallback.unmatchedItems || []);

  return {
    matchedCount,
    pricedCount,
    promoMatchedCount,
    total,
    percent,
    estimatedPercent,
    promoPercent,
    estimatedTotal: Number(estimatedTotal.toFixed(2)),
    matchedOffers: matchedOffers.length > 0 ? matchedOffers : (fallback.matchedOffers || []),
    unmatchedItems,
  };
}

async function analyzeWithCloude({
  coords,
  stores,
  ingredientItems,
  basket,
  minRecommendedCoverage,
  useFallbackOnly,
  forceFallbackCoords,
  includeOnlineStores,
}) {
  if (!CLOUDE_ANALYZER_URL) {
    throw new Error('Missing VITE_CLOUDE_ANALYZER_URL');
  }

  try {
    const response = await fetch(CLOUDE_ANALYZER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(CLOUDE_ANALYZER_KEY ? { Authorization: `Bearer ${CLOUDE_ANALYZER_KEY}` } : {}),
      },
      body: JSON.stringify({
        provider: 'cloude',
        mode: 'full_market_report',
        searchRadiusKm: 15,
        coords,
        chains: Array.from(TARGET_CHAIN_IDS),
        physicalChains: Array.from(TARGET_PHYSICAL_CHAIN_IDS),
        onlineChains: ['ebag', 'supermag'],
        minRecommendedCoverage,
        useFallbackOnly: Boolean(useFallbackOnly),
        forceFallbackCoords: Boolean(forceFallbackCoords),
        includeOnlineStores: Boolean(includeOnlineStores),
        stores: (stores || []).map((store) => ({
          id: store.id,
          chainId: store.chainId,
          chainLabel: store.chainLabel,
          lat: store.lat,
          lon: store.lon,
          distanceKm: store.distanceKm ?? null,
        })),
        ingredientItems,
        basket,
      }),
    });

    if (!response.ok) {
      throw new Error(`Cloude analyzer HTTP ${response.status}`);
    }

    const payload = await response.json();
    return payload?.report ? payload.report : payload;
  } catch (error) {
    throw new Error(error?.message || 'Cloude analyzer request failed');
  }
}

function normalizeCloudStore(rawStore, coords, ingredientItems) {
  const chainInfo = resolveAllowedChain(rawStore?.name || rawStore?.chainLabel || '', rawStore?.brand || '', rawStore?.operator || '');
  const chainId = String(rawStore?.chainId || chainInfo?.chainId || '').trim().toLowerCase();
  const chainLabel = String(rawStore?.chainLabel || chainInfo?.chainLabel || rawStore?.name || chainId || 'Store').trim();
  if (!TARGET_CHAIN_IDS.has(chainId)) {
    return null;
  }

  const isOnline = Boolean(rawStore?.isOnline) || chainId === 'ebag' || chainId === 'supermag';
  const distanceKm = Number.isFinite(rawStore?.distanceKm)
    ? Number(rawStore.distanceKm)
    : (!isOnline && Number.isFinite(rawStore?.lat) && Number.isFinite(rawStore?.lon)
      ? Number(haversineKm(coords, { lat: Number(rawStore.lat), lon: Number(rawStore.lon) }).toFixed(2))
      : null);

  if (!isOnline && distanceKm !== null && distanceKm > 15) {
    return null;
  }

  const fallbackCoverage = {
    matchedCount: 0,
    pricedCount: 0,
    promoMatchedCount: 0,
    total: ingredientItems.length,
    percent: 0,
    estimatedPercent: 0,
    promoPercent: 0,
    estimatedTotal: 0,
    matchedOffers: [],
    unmatchedItems: ingredientItems.map((item) => item.name),
  };
  const coverage = normalizeCloudeCoverage(rawStore?.coverage || rawStore, fallbackCoverage, ingredientItems);
  const confidenceSeed = coverage.matchedOffers.map((entry) => entry.offer);

  return {
    id: rawStore?.id || rawStore?.storeId || `${chainId}_${Math.random().toString(36).slice(2, 8)}`,
    chainId,
    chainLabel,
    name: rawStore?.name || chainLabel,
    isOnline,
    lat: Number.isFinite(rawStore?.lat) ? Number(rawStore.lat) : coords.lat,
    lon: Number.isFinite(rawStore?.lon) ? Number(rawStore.lon) : coords.lon,
    address: rawStore?.address || (isOnline ? 'Online' : ''),
    offers: confidenceSeed,
    coverage,
    distanceKm: distanceKm !== null ? Number(distanceKm.toFixed(2)) : null,
    priceConfidence: summarizeConfidence(confidenceSeed),
    score: Number(rawStore?.score || (coverage.percent * 1.2 + coverage.matchedCount * 2 - (distanceKm || 0))),
    analysisSource: 'cloude',
    brochureHighlights: Array.isArray(rawStore?.brochureHighlights) ? rawStore.brochureHighlights.slice(0, 4) : [],
    directionsUrl: rawStore?.directionsUrl || makeDirectionsUrl({ ...rawStore, isOnline, lat: rawStore?.lat, lon: rawStore?.lon }, coords),
    offerUrl: rawStore?.offerUrl || '',
  };
}

function normalizeCloudeReport(report, { coords, ingredientItems, minRecommendedCoverage, fx, familyAdjustments }) {
  const sourceStores = Array.isArray(report?.stores)
    ? report.stores
    : (Array.isArray(report?.report?.stores) ? report.report.stores : []);
  const normalizedStores = sourceStores
    .map((store) => normalizeCloudStore(store, coords, ingredientItems))
    .filter(Boolean)
    .sort((a, b) => {
      if (b.coverage.percent !== a.coverage.percent) {
        return b.coverage.percent - a.coverage.percent;
      }
      const aDist = a.distanceKm ?? Number.POSITIVE_INFINITY;
      const bDist = b.distanceKm ?? Number.POSITIVE_INFINITY;
      return aDist - bDist;
    });

  const recommendedStoreId = report?.recommendedStoreId
    || normalizedStores.find((store) => !store.isOnline && store.coverage.percent >= minRecommendedCoverage)?.id
    || normalizedStores.find((store) => !store.isOnline)?.id
    || normalizedStores[0]?.id
    || null;

  const bestCoveragePercent = Number(report?.bestCoveragePercent || normalizedStores[0]?.coverage?.percent || 0);

  return {
    coords,
    searchRadiusKm: 15,
    analysisProvider: 'Cloude',
    analysisSummary: String(report?.analysisSummary || report?.summary || 'Cloud-selected stores and budget optimization'),
    recommendedStoreId,
    minRecommendedCoverage,
    bestCoveragePercent,
    fx,
    familyAdjustments: {
      count: familyAdjustments.length,
      lines: familyAdjustments.slice(0, 6),
    },
    optimization: {
      splitPlan: report?.optimization?.splitPlan || {
        total: 0,
        itemCount: 0,
        storeCount: 0,
        savingsVsCheapestSingle: 0,
        assignments: [],
      },
      swapSuggestions: Array.isArray(report?.optimization?.swapSuggestions)
        ? report.optimization.swapSuggestions
        : [],
    },
    stores: normalizedStores,
  };
}

function mergeCloudeIntoStores(localStores, cloudeResult, ingredientItems) {
  if (!cloudeResult?.stores?.length) {
    return { stores: localStores, usedCloude: false };
  }

  const cloudeByKey = new Map();
  for (const store of cloudeResult.stores) {
    const idKey = String(store?.id || store?.storeId || '').trim();
    const chainIdKey = String(store?.chainId || '').trim();
    const chainLabelKey = normalizeText(store?.chainLabel || '');
    if (idKey) {
      cloudeByKey.set(`id:${idKey}`, store);
    }
    if (chainIdKey) {
      cloudeByKey.set(`chain:${chainIdKey}`, store);
    }
    if (chainLabelKey) {
      cloudeByKey.set(`label:${chainLabelKey}`, store);
    }
  }

  let usedCloude = false;
  const merged = localStores.map((store) => {
    const cloudEntry =
      cloudeByKey.get(`id:${store.id}`) ||
      cloudeByKey.get(`chain:${store.chainId}`) ||
      cloudeByKey.get(`label:${normalizeText(store.chainLabel)}`) ||
      null;

    if (!cloudEntry) {
      return store;
    }

    usedCloude = true;
    const coverage = normalizeCloudeCoverage(cloudEntry.coverage || cloudEntry, store.coverage, ingredientItems);
    const confidenceSeed = coverage.matchedOffers.map((entry) => entry.offer);

    return {
      ...store,
      coverage,
      offers: confidenceSeed.length ? confidenceSeed : store.offers,
      priceConfidence: summarizeConfidence(confidenceSeed),
      analysisSource: 'cloude',
      brochureHighlights: Array.isArray(cloudEntry?.brochureHighlights)
        ? cloudEntry.brochureHighlights.slice(0, 4)
        : [],
    };
  });

  return {
    stores: merged,
    usedCloude,
  };
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
  const chainId = String(storeId || '').replace(/^online_/, '');

  if (useFallbackOnly) {
    return getChainFallbackOffers(chainId, chainLabel);
  }

  // Try to get real prices from scraper database
  let offers = getPricesForStore(storeId, chainLabel, ingredientNames);

  // If no offers found for this store, use generic fallback
  if (!offers || offers.length === 0) {
    offers = getChainFallbackOffers(chainId, chainLabel);
  }
  return offers.map((offer) => addOfferConfidence(offer, chainLabel));
}

function addOfferConfidence(offer, chainLabel) {
  const sourceType = offer.sourceType || (offer.scraped ? 'live_offer' : 'fallback_estimate');
  let confidenceLevel = 'low';
  let confidenceReason = 'Estimated price';

  if (offer.scraped || offer.discountPercent > 0 || sourceType === 'live_offer') {
    confidenceLevel = 'high';
    confidenceReason = 'Live or brochure-backed offer';
  } else if (sourceType === 'manual_db') {
    confidenceLevel = 'medium';
    confidenceReason = `${chainLabel} price database`;
  } else if (sourceType === 'fallback_estimate') {
    confidenceLevel = 'low';
    confidenceReason = 'Category estimate';
  }

  return {
    ...offer,
    sourceType,
    confidenceLevel,
    confidenceReason,
  };
}

function summarizeConfidence(offers = []) {
  const counts = { high: 0, medium: 0, low: 0 };
  for (const offer of offers) {
    const level = offer?.confidenceLevel || 'low';
    counts[level] = (counts[level] || 0) + 1;
  }

  let level = 'low';
  if (counts.high > 0 && counts.high >= counts.medium) {
    level = 'high';
  } else if (counts.medium > 0) {
    level = 'medium';
  }

  return {
    level,
    counts,
  };
}

function findBestOfferForIngredient(stores, ingredientItem) {
  let best = null;
  for (const store of stores) {
    for (const offer of store.offers || []) {
      if (!ingredientMatchesOffer(ingredientItem.name, offer.keyword) || offer.price === null) {
        continue;
      }
      const pkgSizeG = parsePackageSizeGrams(offer.title) || DEFAULT_PACKAGE_SIZE_G;
      const packagesNeeded = ingredientItem.totalGrams > 0
        ? Math.max(1, Math.ceil(ingredientItem.totalGrams / pkgSizeG))
        : (ingredientItem.count >= 2 ? ingredientItem.count : 1);
      const totalPrice = offer.price * packagesNeeded;
      if (!best || totalPrice < best.totalPrice) {
        best = {
          ingredient: ingredientItem.name,
          storeId: store.id,
          chainLabel: store.chainLabel,
          totalPrice: Number(totalPrice.toFixed(2)),
          confidenceLevel: offer.confidenceLevel,
        };
      }
    }
  }
  return best;
}

function buildSplitBasketPlan(stores, ingredientItems) {
  const assignments = new Map();
  let splitTotal = 0;
  let itemCount = 0;

  for (const ingredientItem of ingredientItems.filter((item) => !isPantryItem(item.name))) {
    const best = findBestOfferForIngredient(stores, ingredientItem);
    if (!best) {
      continue;
    }

    itemCount += 1;
    splitTotal += best.totalPrice;
    const assignmentKey = best.chainLabel || best.storeId;
    const existing = assignments.get(assignmentKey) || {
      storeId: best.storeId,
      chainLabel: best.chainLabel,
      subtotal: 0,
      items: [],
    };
    existing.items.push({
      ingredient: best.ingredient,
      totalPrice: best.totalPrice,
      confidenceLevel: best.confidenceLevel,
    });
    existing.subtotal += best.totalPrice;
    assignments.set(assignmentKey, existing);
  }

  const cheapestSingleTotal = stores
    .map((store) => Number(store.coverage?.estimatedTotal || 0))
    .filter((value) => value > 0)
    .sort((a, b) => a - b)[0] || 0;

  return {
    total: Number(splitTotal.toFixed(2)),
    itemCount,
    storeCount: assignments.size,
    savingsVsCheapestSingle: cheapestSingleTotal > 0
      ? Number((cheapestSingleTotal - splitTotal).toFixed(2))
      : 0,
    assignments: Array.from(assignments.values())
      .map((entry) => ({
        ...entry,
        subtotal: Number(entry.subtotal.toFixed(2)),
        items: entry.items.sort((a, b) => b.totalPrice - a.totalPrice),
      }))
      .sort((a, b) => b.subtotal - a.subtotal),
  };
}

function getCheapestOfferPriceForToken(stores, token) {
  let best = null;
  for (const store of stores) {
    for (const offer of store.offers || []) {
      if (!ingredientMatchesOffer(token, offer.keyword) || offer.price === null) {
        continue;
      }
      if (!best || offer.price < best.price) {
        best = {
          price: offer.price,
          chainLabel: store.chainLabel,
        };
      }
    }
  }
  return best;
}

function getBlockedSwapTokens(familyProfiles = []) {
  const blocked = new Set();
  const exclusionToTokens = {
    no_beef: ['beef'],
    no_pork: ['pork'],
    no_chicken: ['chicken'],
    no_seafood: ['fish', 'salmon', 'tuna', 'cod', 'seafood'],
    lactose_free: ['milk', 'cheese', 'butter', 'yogurt'],
    gluten_free: ['flour', 'pasta', 'bread'],
  };

  for (const profile of familyProfiles || []) {
    for (const exclusion of profile?.exclusions || []) {
      for (const token of exclusionToTokens[exclusion] || []) {
        blocked.add(canonicalToken(token));
      }
    }

    for (const replacement of profile?.replacements || []) {
      const fromToken = canonicalToken(replacement?.from || '');
      if (fromToken) {
        blocked.add(fromToken);
      }
    }
  }

  return blocked;
}

function buildSwapSuggestions(stores, ingredientItems, familyProfiles = []) {
  const presentTokens = new Set(ingredientItems.map((item) => canonicalToken(item.name)).filter(Boolean));
  const blockedTokens = getBlockedSwapTokens(familyProfiles);
  return SMART_BUDGET_SWAPS
    .filter((rule) => presentTokens.has(rule.from))
    .filter((rule) => !blockedTokens.has(canonicalToken(rule.from)) && !blockedTokens.has(canonicalToken(rule.to)))
    .map((rule) => {
      const original = getCheapestOfferPriceForToken(stores, rule.from);
      const replacement = getCheapestOfferPriceForToken(stores, rule.to);
      if (!original || !replacement || replacement.price >= original.price) {
        return null;
      }
      return {
        ...rule,
        priceFrom: original.price,
        priceTo: replacement.price,
        savings: Number((original.price - replacement.price).toFixed(2)),
        replacementStore: replacement.chainLabel,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.savings - a.savings)
    .slice(0, 3);
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
    familyProfiles = [],
    useCloudeAnalysis = true,
    includeOnlineStores = true,
  } = options;

  const allBasketIngredients = getBasketIngredients(basket);
  const ingredientByCanonical = new Map();
  const familyAdjustments = [];
  for (const item of allBasketIngredients) {
    const adjustedName = resolveFamilyAdjustedIngredientName(item.name, familyProfiles);
    if (normalizeText(adjustedName) && normalizeText(adjustedName) !== normalizeText(item.name)) {
      familyAdjustments.push({
        from: item.name,
        to: adjustedName,
      });
    }

    const canonical = canonicalToken(adjustedName);
    if (!canonical) {
      continue;
    }
    const current = ingredientByCanonical.get(canonical);
    if (!current) {
      ingredientByCanonical.set(canonical, {
        name: canonical === 'flour' ? 'Flour' : adjustedName,
        totalGrams: item.totalGrams || 0,
        count: item.count || 1,
      });
      continue;
    }
    current.totalGrams += item.totalGrams || 0;
    current.count += item.count || 1;
  }
  const ingredientItems = Array.from(ingredientByCanonical.values());
  const coords = forceFallbackCoords
    ? { ...DEFAULT_COORDS, isFallback: true }
    : await getUserCoords();

  const fx = await getFxRates();

  if (!useCloudeAnalysis) {
    throw new Error('Market analysis requires Cloude');
  }

  const cloudeReport = await analyzeWithCloude({
    coords,
    stores: [],
    ingredientItems,
    basket,
    minRecommendedCoverage,
    useFallbackOnly,
    forceFallbackCoords,
    includeOnlineStores,
  });

  return normalizeCloudeReport(cloudeReport, {
    coords,
    ingredientItems,
    minRecommendedCoverage,
    fx,
    familyAdjustments,
  });
}
