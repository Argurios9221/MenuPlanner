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
];

// BGN ÷ 1.96 ≈ EUR  (approximate, indicative prices)
const FALLBACK_OFFERS = {
  lidl: [
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
};

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .trim();
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
  if (!chain) {
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

async function fetchNearbyChains(coords) {
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
    return CHAIN_DEFS.map((chain) => ({
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

async function getChainOffers(chainId, ingredientNames) {
  const chain = CHAIN_DEFS.find((c) => c.id === chainId);
  if (!chain) {
    return [];
  }

  const text = await fetchOfferText(chain.offerPage);
  const live = extractLiveOffers(text, ingredientNames);
  if (live.length > 0) {
    return live.slice(0, 30);
  }

  return FALLBACK_OFFERS[chainId] || [];
}

function getCoverage(offers, ingredientNames) {
  const matched = new Set();
  const matchedOffers = [];
  const unmatchedItems = [];
  let estimatedTotal = 0;

  for (const ingredient of ingredientNames) {
    const normalizedIngredient = normalizeText(ingredient);
    let foundOffer = null;
    for (const offer of offers) {
      const keyword = normalizeText(offer.keyword);
      if (keyword && normalizedIngredient.includes(keyword)) {
        foundOffer = offer;
        break;
      }
    }
    if (foundOffer) {
      if (!matched.has(normalizedIngredient) && foundOffer.price != null) {
        estimatedTotal += foundOffer.price;
      }
      matched.add(normalizedIngredient);
      matchedOffers.push({ ingredient, offer: foundOffer });
    } else {
      unmatchedItems.push(ingredient);
    }
  }

  return {
    matchedCount: matched.size,
    total: ingredientNames.length,
    percent: ingredientNames.length > 0 ? Math.round((matched.size / ingredientNames.length) * 100) : 0,
    estimatedTotal: Number(estimatedTotal.toFixed(2)),
    matchedOffers,
    unmatchedItems,
  };
}

function makeDirectionsUrl(store) {
  return `https://www.google.com/maps/dir/?api=1&destination=${store.lat},${store.lon}`;
}

export async function buildSupermarketRecommendations(basket) {
  const basketIngredients = getBasketIngredients(basket).map((item) => item.name);
  const ingredientNames = Array.from(new Set(basketIngredients.map((name) => normalizeText(name)).filter(Boolean)));

  const coords = await getUserCoords();
  const nearbyStores = await fetchNearbyChains(coords);

  const offersByChain = {};
  for (const chain of CHAIN_DEFS) {
    offersByChain[chain.id] = await getChainOffers(chain.id, ingredientNames);
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
      directionsUrl: makeDirectionsUrl(store),
      offerUrl: CHAIN_DEFS.find((c) => c.id === store.chainId)?.offerPage || '',
    };
  });

  enriched.sort((a, b) => b.score - a.score);

  return {
    coords,
    recommendedStoreId: enriched[0]?.id || null,
    stores: enriched,
  };
}
