import { getBasketIngredients } from './basket.js';

const DEFAULT_COORDS = { lat: 42.6977, lon: 23.3219 }; // Sofia fallback
const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

const CHAIN_DEFS = [
  {
    id: 'lidl',
    label: 'Lidl',
    aliases: ['lidl'],
    offerPage: 'https://www.lidl.bg/c/oferti/s10006010',
  },
  {
    id: 'kaufland',
    label: 'Kaufland',
    aliases: ['kaufland'],
    offerPage: 'https://www.kaufland.bg/aktualni-oferti.html',
  },
  {
    id: 'metro',
    label: 'Metro',
    aliases: ['metro'],
    offerPage: 'https://www.metro.bg/promocii-i-katalozi',
  },
  {
    id: 'fantastico',
    label: 'Fantastico',
    aliases: ['fantastico', 'фантастико'],
    offerPage: 'https://www.fantastico.bg',
  },
  {
    id: 'billa',
    label: 'BILLA',
    aliases: ['billa', 'билла'],
    offerPage: 'https://www.billa.bg/oferti',
  },
  {
    id: 'tmarket',
    label: 'T-Market',
    aliases: ['t-market', 't market', 'т маркет', 'tmarket'],
    offerPage: 'https://www.tmarket.bg/%D0%B0%D0%BA%D1%82%D1%83%D0%B0%D0%BB%D0%BD%D0%B8-%D0%BE%D1%84%D0%B5%D1%80%D1%82%D0%B8/',
  },
  {
    id: 'ebag_online',
    label: 'EBAG.bg (Online)',
    aliases: ['ebag', 'ebag.bg'],
    offerPage: 'https://www.ebag.bg/promotions',
    onlineOnly: true,
  },
];

// BGN ÷ 1.96 ≈ EUR  (approximate, indicative prices)
const FALLBACK_OFFERS = {
  lidl: [
    { keyword: 'oat', title: 'Овесени ядки', price: 1.12 },
    { keyword: 'bean', title: 'Боб зрял', price: 1.43 },
    { keyword: 'chickpea', title: 'Нахут консерва', price: 1.33 },
    { keyword: 'tofu', title: 'Тофу натурално', price: 2.45 },
    { keyword: 'cod', title: 'Филе от треска', price: 4.59 },
    { keyword: 'bread', title: 'Хлебчета за бургер', price: 1.27 },
    { keyword: 'banana', title: 'Банани premium', price: 1.12 },
    { keyword: 'strawberry', title: 'Ягоди свежи', price: 1.84 },
    { keyword: 'onion', title: 'Кромид лук', price: 0.55 },
    { keyword: 'potato', title: 'Картофи свежи', price: 0.72 },
    { keyword: 'beef', title: 'Телешко за готвене', price: 6.89 },
    { keyword: 'pork', title: 'Свинско месо', price: 4.65 },
    { keyword: 'lamb', title: 'Агнешко месо', price: 8.95 },
    { keyword: 'garlic', title: 'Чесън', price: 0.89 },
    { keyword: 'mushroom', title: 'Гъби пресни', price: 1.66 },
    { keyword: 'pepper', title: 'Чушки пресни', price: 1.05 },
    { keyword: 'lemon', title: 'Лимони', price: 1.02 },
    { keyword: 'tomato', title: 'Домати (промо)', price: 1.27 },
    { keyword: 'chicken', title: 'Пиле свежо', price: 5.10 },
    { keyword: 'milk', title: 'Прясно мляко 3.5%', price: 1.17 },
    { keyword: 'pasta', title: 'Паста italiana', price: 0.92 },
    { keyword: 'egg', title: 'Яйца М 10 бр.', price: 2.05 },
    { keyword: 'bread', title: 'Хляб бял 500g', price: 0.85 },
    { keyword: 'carrot', title: 'Моркови БГ', price: 0.77 },
    { keyword: 'orange', title: 'Портокали свежи', price: 1.53 },
    { keyword: 'yogurt', title: 'Кисело мляко 400g', price: 0.87 },
    { keyword: 'butter', title: 'Масло 125g', price: 1.84 },
    { keyword: 'flour', title: 'Брашно тип 500', price: 0.77 },
    { keyword: 'oil', title: 'Слъл. масло 1L', price: 3.07 },
    { keyword: 'sugar', title: 'Захар бяла 1kg', price: 0.87 },
    { keyword: 'rice', title: 'Ориз кръглозърнест', price: 1.02 },
    { keyword: 'cheese', title: 'Сирене бяло 400g', price: 2.55 },
  ],
  kaufland: [
    { keyword: 'oat', title: 'Овесени ядки K-Bio', price: 1.02 },
    { keyword: 'bean', title: 'Червен боб консерва', price: 1.17 },
    { keyword: 'chickpea', title: 'Нахут K-Classic', price: 1.17 },
    { keyword: 'tofu', title: 'Тофу класик', price: 2.35 },
    { keyword: 'cod', title: 'Треска филе', price: 4.49 },
    { keyword: 'bread', title: 'Питки за бургер', price: 1.22 },
    { keyword: 'pasta', title: 'Паста K-Classic', price: 0.92 },
    { keyword: 'cheese', title: 'Сирене качество', price: 2.55 },
    { keyword: 'onion', title: 'Кромид лук', price: 0.66 },
    { keyword: 'beef', title: 'Телешко филе', price: 7.40 },
    { keyword: 'rice', title: 'Ориз дългозърнест', price: 1.63 },
    { keyword: 'salmon', title: 'Сьомга филе', price: 5.61 },
    { keyword: 'potato', title: 'Картофи БГ', price: 0.66 },
    { keyword: 'broccoli', title: 'Броколи свежо', price: 1.02 },
    { keyword: 'apple', title: 'Ябълки Golden', price: 1.12 },
    { keyword: 'pork', title: 'Свинско бонсф.', price: 4.59 },
    { keyword: 'sugar', title: 'Захар 1kg', price: 0.87 },
    { keyword: 'cream', title: 'Сметана 30%', price: 1.02 },
    { keyword: 'tomato', title: 'Домати черешени', price: 1.53 },
    { keyword: 'egg', title: 'Яйца L 12 бр.', price: 2.55 },
    { keyword: 'milk', title: 'Мляко UHT 1L', price: 1.02 },
  ],
  metro: [
    { keyword: 'oat', title: 'Овесени ядки premium', price: 1.53 },
    { keyword: 'bean', title: 'Боб микс 1kg', price: 2.55 },
    { keyword: 'chickpea', title: 'Нахут сух 1kg', price: 2.24 },
    { keyword: 'tofu', title: 'Тофу блок', price: 2.86 },
    { keyword: 'cod', title: 'Треска атлантическа', price: 5.10 },
    { keyword: 'bread', title: 'Бургер хлебчета', price: 1.43 },
    { keyword: 'rice', title: 'Ориз жасмин 5kg', price: 3.57 },
    { keyword: 'beef', title: 'Телешко T-bone', price: 12.24 },
    { keyword: 'butter', title: 'Масло несол. 500g', price: 3.57 },
    { keyword: 'chicken', title: 'Пиле цяло 1.5kg', price: 5.61 },
    { keyword: 'seafood', title: 'Миди замр.', price: 8.16 },
    { keyword: 'lamb', title: 'Агнешко бут', price: 9.69 },
    { keyword: 'olive oil', title: 'Маслиново масло extra', price: 5.10 },
    { keyword: 'mushroom', title: 'Шампиньони свежи', price: 1.84 },
    { keyword: 'garlic', title: 'Чесън БГ', price: 1.02 },
    { keyword: 'tomato', title: 'Доматено пюре 800g', price: 1.53 },
    { keyword: 'cream', title: 'Сметана UHT 1L', price: 2.04 },
    { keyword: 'cheese', title: 'Кашкавал стар.', price: 3.57 },
    { keyword: 'salmon', title: 'Сьомга атлантич.', price: 7.65 },
    { keyword: 'pork', title: 'Свинско каре', price: 5.10 },
    { keyword: 'pasta', title: 'Pasta De Cecco', price: 2.04 },
  ],
  fantastico: [
    { keyword: 'oat', title: 'Овесени ядки БГ', price: 1.17 },
    { keyword: 'bean', title: 'Бял боб', price: 1.33 },
    { keyword: 'chickpea', title: 'Нахут буркан', price: 1.43 },
    { keyword: 'tofu', title: 'Тофу fresh', price: 2.55 },
    { keyword: 'cod', title: 'Треска филе fresh', price: 4.84 },
    { keyword: 'bread', title: 'Питки за бургер', price: 1.27 },
    { keyword: 'apple', title: 'Ябълки Pink Lady', price: 1.53 },
    { keyword: 'yogurt', title: 'Кисело мл. БГ', price: 0.87 },
    { keyword: 'potato', title: 'Картофи червени', price: 0.77 },
    { keyword: 'pepper', title: 'Чушки капия', price: 1.02 },
    { keyword: 'cucumber', title: 'Краставици БГ', price: 0.77 },
    { keyword: 'lemon', title: 'Лимони Тунис', price: 1.02 },
    { keyword: 'banana', title: 'Банани Еквадор', price: 1.12 },
    { keyword: 'spinach', title: 'Спанак свежо', price: 0.92 },
    { keyword: 'zucchini', title: 'Тиквички БГ', price: 0.87 },
    { keyword: 'strawberry', title: 'Ягоди свежи', price: 1.84 },
    { keyword: 'grapes', title: 'Грозде черно', price: 2.04 },
    { keyword: 'tomato', title: 'Домати биво', price: 1.02 },
    { keyword: 'onion', title: 'Кромид лук БГ', price: 0.51 },
    { keyword: 'carrot', title: 'Моркови местни', price: 0.61 },
    { keyword: 'milk', title: 'Прясно мляко 2%', price: 1.12 },
  ],
  billa: [
    { keyword: 'tomato', title: 'Домати BILLA', price: 1.22 },
    { keyword: 'cucumber', title: 'Краставици BILLA', price: 0.79 },
    { keyword: 'onion', title: 'Лук жълт', price: 0.52 },
    { keyword: 'potato', title: 'Картофи готварски', price: 0.69 },
    { keyword: 'chicken', title: 'Пилешко филе', price: 5.25 },
    { keyword: 'pork', title: 'Свинско плешка', price: 4.75 },
    { keyword: 'beef', title: 'Телешко месо', price: 7.15 },
    { keyword: 'rice', title: 'Ориз бял', price: 1.28 },
    { keyword: 'egg', title: 'Яйца 10 бр.', price: 2.09 },
    { keyword: 'cheese', title: 'Бяло саламурено сирене', price: 2.62 },
    { keyword: 'yogurt', title: 'Кисело мляко', price: 0.89 },
    { keyword: 'garlic', title: 'Чесън глава', price: 0.91 },
  ],
  tmarket: [
    { keyword: 'tomato', title: 'Домати пресни', price: 1.16 },
    { keyword: 'pepper', title: 'Чушки зелени', price: 1.04 },
    { keyword: 'carrot', title: 'Моркови', price: 0.58 },
    { keyword: 'banana', title: 'Банани', price: 1.09 },
    { keyword: 'milk', title: 'Прясно мляко', price: 1.09 },
    { keyword: 'bread', title: 'Хляб / питки', price: 0.96 },
    { keyword: 'bean', title: 'Боб консерва', price: 1.19 },
    { keyword: 'pasta', title: 'Паста класик', price: 0.94 },
    { keyword: 'mushroom', title: 'Гъби', price: 1.71 },
    { keyword: 'cheese', title: 'Сирене краве', price: 2.48 },
    { keyword: 'egg', title: 'Яйца 10 бр.', price: 2.01 },
    { keyword: 'chicken', title: 'Пилешко бутче', price: 4.99 },
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
  const raw = normalizeText(value).replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!raw) {
    return '';
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
  return ingredientToken.includes(keywordToken) || keywordToken.includes(ingredientToken);
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

function getChainByName(rawName) {
  const text = normalizeText(rawName);
  return CHAIN_DEFS.find((chain) => chain.aliases.some((alias) => text.includes(alias)));
}

function parseOverpassElement(el) {
  const lat = el.lat || el.center?.lat;
  const lon = el.lon || el.center?.lon;
  if (typeof lat !== 'number' || typeof lon !== 'number') {
    return null;
  }

  const name = el.tags?.name || el.tags?.brand || el.tags?.operator || '';
  const chain = getChainByName(name);
  if (!chain || chain.onlineOnly) {
    return null;
  }

  return {
    id: `${chain.id}_${el.id}`,
    chainId: chain.id,
    chainLabel: chain.label,
    name: name || chain.label,
    lat,
    lon,
    address: [el.tags?.['addr:street'], el.tags?.['addr:housenumber']].filter(Boolean).join(' '),
  };
}

async function getUserCoords() {
  if (!navigator.geolocation) {
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
    return CHAIN_DEFS.filter((chain) => !chain.onlineOnly).map((chain) => ({
      id: `${chain.id}_fallback`,
      chainId: chain.id,
      chainLabel: chain.label,
      name: chain.label,
      lat: coords.lat,
      lon: coords.lon,
      address: '',
      isFallback: true,
    }));
  }

  const query = `
    [out:json][timeout:25];
    (
      node["shop"="supermarket"](around:8000,${coords.lat},${coords.lon});
      way["shop"="supermarket"](around:8000,${coords.lat},${coords.lon});
      relation["shop"="supermarket"](around:8000,${coords.lat},${coords.lon});
    );
    out center tags;
  `;

  try {
    const response = await fetch(OVERPASS_API, {
      method: 'POST',
      body: query,
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const parsed = (data.elements || []).map(parseOverpassElement).filter(Boolean);

    const deduped = new Map();
    for (const store of parsed) {
      if (!deduped.has(store.id)) {
        deduped.set(store.id, store);
      }
    }

    return Array.from(deduped.values());
  } catch {
    return CHAIN_DEFS.filter((chain) => !chain.onlineOnly).map((chain) => ({
      id: `${chain.id}_fallback`,
      chainId: chain.id,
      chainLabel: chain.label,
      name: chain.label,
      lat: coords.lat,
      lon: coords.lon,
      address: '',
      isFallback: true,
    }));
  }
}

async function fetchOfferText(url) {
  const stripped = String(url || '').replace(/^https?:\/\//, '');
  if (!stripped) {
    return '';
  }

  // Best-effort proxy to read public pages in browser context.
  const proxyUrl = `https://r.jina.ai/http://${stripped}`;

  try {
    const response = await fetch(proxyUrl);
    if (!response.ok) {
      return '';
    }
    return await response.text();
  } catch {
    return '';
  }
}

const BGN_TO_EUR = 1 / 1.9558; // fixed ECB rate

function extractLiveOffers(text, ingredientNames) {
  const hay = normalizeText(text);
  const offers = [];

  for (const name of ingredientNames) {
    const key = normalizeText(name);
    if (!key || key.length < 3) {
      continue;
    }

    if (!hay.includes(key)) {
      continue;
    }

    const idx = hay.indexOf(key);
    const snippet = hay.slice(Math.max(0, idx - 80), idx + 140);
    const priceMatch = snippet.match(/(\d+[.,]\d{1,2})\s*(лв|lv|bgn|€)/i);
    let price = null;
    if (priceMatch) {
      const raw = Number(priceMatch[1].replace(',', '.'));
      const currency = priceMatch[2].toLowerCase();
      // Convert BGN to EUR if needed
      price = Number((currency === '€' ? raw : raw * BGN_TO_EUR).toFixed(2));
    }

    offers.push({
      keyword: key,
      title: key,
      price,
      source: 'live',
    });
  }

  return offers;
}

async function getChainOffers(chainId, ingredientNames, options = {}) {
  const { useFallbackOnly = false } = options;
  const chain = CHAIN_DEFS.find((c) => c.id === chainId);
  if (!chain) {
    return [];
  }

  if (useFallbackOnly) {
    return FALLBACK_OFFERS[chainId] || [];
  }

  const text = await fetchOfferText(chain.offerPage);
  const live = extractLiveOffers(text, ingredientNames);
  if (live.length > 0) {
    return live.slice(0, 30);
  }

  return (FALLBACK_OFFERS[chainId] || []).map((offer) => ({
    ...offer,
    source: 'fallback',
  }));
}

function getCoverage(offers, ingredientNames) {
  const available = new Set();
  const promoMatched = new Set();
  const matchedOffers = [];
  const unmatchedItems = [];
  let estimatedTotal = 0;

  const relevantIngredients = ingredientNames.filter((ingredient) => !isPantryItem(ingredient));

  for (const ingredient of relevantIngredients) {
    const normalizedIngredient = normalizeText(ingredient);
    let foundOffer = null;
    for (const offer of offers) {
      if (ingredientMatchesOffer(normalizedIngredient, offer.keyword)) {
        foundOffer = offer;
        break;
      }
    }

    const matchedByAvailability = Boolean(foundOffer) || isLikelyAvailableInStore(normalizedIngredient);

    if (matchedByAvailability) {
      available.add(normalizedIngredient);
    }

    if (foundOffer) {
      if (!promoMatched.has(normalizedIngredient) && foundOffer.price !== null) {
        estimatedTotal += foundOffer.price;
      }
      promoMatched.add(normalizedIngredient);
      matchedOffers.push({ ingredient, offer: foundOffer });
    }

    if (!matchedByAvailability) {
      unmatchedItems.push(ingredient);
    }
  }

  const total = relevantIngredients.length;
  const availabilityPercent = total > 0 ? Math.round((available.size / total) * 100) : 0;
  const promoPercent = total > 0 ? Math.round((promoMatched.size / total) * 100) : 0;

  return {
    matchedCount: available.size,
    promoMatchedCount: promoMatched.size,
    total,
    percent: availabilityPercent,
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

  const basketIngredients = getBasketIngredients(basket).map((item) => item.name);
  const ingredientNames = Array.from(new Set(basketIngredients.map((name) => normalizeText(name)).filter(Boolean)));

  const coords = forceFallbackCoords
    ? { ...DEFAULT_COORDS, isFallback: true }
    : await getUserCoords();
  const shouldUseFallbackOnly = useFallbackOnly || forceFallbackCoords;
  const nearbyStores = await fetchNearbyChains(coords, { useFallbackOnly: shouldUseFallbackOnly });

  const offersByChain = {};
  for (const chain of CHAIN_DEFS) {
    offersByChain[chain.id] = await getChainOffers(chain.id, ingredientNames, {
      useFallbackOnly: shouldUseFallbackOnly,
    });
  }

  const enriched = nearbyStores.map((store) => {
    const offers = offersByChain[store.chainId] || [];
    const coverage = getCoverage(offers, ingredientNames);
    const distanceKm = store.isFallback ? null : haversineKm(coords, { lat: store.lat, lon: store.lon });
    const score = coverage.percent * 1.2 + coverage.matchedCount * 2 - (distanceKm ?? 5) * 1.5;

    return {
      ...store,
      offers,
      coverage,
      distanceKm: distanceKm !== null ? Number(distanceKm.toFixed(2)) : null,
      score,
      directionsUrl: makeDirectionsUrl(store, coords),
      offerUrl: CHAIN_DEFS.find((c) => c.id === store.chainId)?.offerPage || '',
    };
  });

  const storesWithInfo = [...enriched];

  const onlineChain = CHAIN_DEFS.find((chain) => chain.onlineOnly);
  if (onlineChain) {
    const onlineOffers = offersByChain[onlineChain.id] || [];
    if (shouldUseFallbackOnly || onlineOffers.length > 0) {
      const onlineCoverage = getCoverage(onlineOffers, ingredientNames);
      storesWithInfo.push({
        id: `${onlineChain.id}_virtual`,
        chainId: onlineChain.id,
        chainLabel: onlineChain.label,
        name: onlineChain.label,
        lat: coords.lat,
        lon: coords.lon,
        address: '',
        isOnline: true,
        offers: onlineOffers,
        coverage: onlineCoverage,
        distanceKm: null,
        score: onlineCoverage.percent * 1.3 + onlineCoverage.matchedCount * 2.2 + 8,
        directionsUrl: '',
        offerUrl: onlineChain.offerPage,
      });
    }
  }

  const byScore = [...storesWithInfo].sort((a, b) => b.score - a.score);
  const physicalByScore = byScore.filter((store) => !store.isOnline);
  const recommended =
    physicalByScore.find((store) => store.coverage.percent >= minRecommendedCoverage) ||
    byScore.find((store) => store.coverage.percent >= minRecommendedCoverage) ||
    byScore[0] ||
    null;
  const bestCoveragePercent = byScore[0]?.coverage?.percent || 0;

  const orderedStores = [
    ...physicalByScore.sort((a, b) => {
      if (b.coverage.percent !== a.coverage.percent) {
        return b.coverage.percent - a.coverage.percent;
      }
      const aDist = a.distanceKm ?? Number.POSITIVE_INFINITY;
      const bDist = b.distanceKm ?? Number.POSITIVE_INFINITY;
      return aDist - bDist;
    }),
    ...byScore.filter((store) => store.isOnline).sort((a, b) => b.coverage.percent - a.coverage.percent),
  ];

  return {
    coords,
    recommendedStoreId: recommended?.id || null,
    minRecommendedCoverage,
    bestCoveragePercent,
    stores: orderedStores,
  };
}
