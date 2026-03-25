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

const FALLBACK_OFFERS = {
  lidl: [
    { keyword: 'tomato', title: 'Tomatoes weekly offer', price: 2.49 },
    { keyword: 'chicken', title: 'Fresh chicken promotion', price: 9.99 },
    { keyword: 'milk', title: 'Dairy week milk', price: 2.29 },
  ],
  kaufland: [
    { keyword: 'pasta', title: 'Italian pasta deal', price: 1.79 },
    { keyword: 'cheese', title: 'Cheese special', price: 4.99 },
    { keyword: 'onion', title: 'Onions discounted', price: 1.29 },
  ],
  metro: [
    { keyword: 'rice', title: 'Large pack rice promo', price: 3.19 },
    { keyword: 'beef', title: 'Beef cut offer', price: 14.49 },
    { keyword: 'butter', title: 'Butter selected brands', price: 3.59 },
  ],
  fantastico: [
    { keyword: 'apple', title: 'Fresh apples deal', price: 2.19 },
    { keyword: 'yogurt', title: 'Yogurt family pack', price: 1.69 },
    { keyword: 'potato', title: 'Potatoes promo', price: 1.39 },
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
    const price = priceMatch ? Number(priceMatch[1].replace(',', '.')) : null;

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
  let estimatedTotal = 0;

  for (const ingredient of ingredientNames) {
    const normalizedIngredient = normalizeText(ingredient);
    for (const offer of offers) {
      const keyword = normalizeText(offer.keyword);
      if (keyword && normalizedIngredient.includes(keyword)) {
        if (!matched.has(normalizedIngredient) && offer.price != null) {
          estimatedTotal += offer.price;
        }
        matched.add(normalizedIngredient);
        break;
      }
    }
  }

  return {
    matchedCount: matched.size,
    total: ingredientNames.length,
    percent: ingredientNames.length > 0 ? Math.round((matched.size / ingredientNames.length) * 100) : 0,
    estimatedTotal: Number(estimatedTotal.toFixed(2)),
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
    const distanceKm = haversineKm(coords, { lat: store.lat, lon: store.lon });
    const score = coverage.percent * 1.2 + coverage.matchedCount * 2 - distanceKm * 1.5;

    return {
      ...store,
      offers,
      coverage,
      distanceKm: Number(distanceKm.toFixed(2)),
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
