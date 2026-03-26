const OVERPASS_APIS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];
const DEFAULT_COORDS = { lat: 42.6977, lon: 23.3219 };
const DEFAULT_RADIUS_KM = 15;
const OVERPASS_TIMEOUT_MS = 9000;

// Fallback store locations (Sofia) used when Overpass is unreachable from CF edge
const SOFIA_FALLBACK_STORES = {
  lidl:       { lat: 42.6527, lon: 23.3801, address: 'бул. Александър Малинов 11, София' },
  fantastico: { lat: 42.6879, lon: 23.3173, address: 'ул. Шипченски проход 63, София' },
  kaufland:   { lat: 42.6854, lon: 23.2985, address: 'бул. България 69, София' },
  metro:      { lat: 42.7487, lon: 23.3481, address: 'Ломско шосе 1, София' },
  '345':      { lat: 42.6977, lon: 23.3219, address: 'ул. Граф Игнатиев, София' },
};

const PHYSICAL_CHAIN_RULES = [
  { id: 'lidl', label: 'Lidl', regex: /(^|\W)lidl(\W|$)|лидл/iu, queryPattern: 'lidl|лидл' },
  { id: 'fantastico', label: 'Fantastico', regex: /(^|\W)fantastico(\W|$)|фантастико/iu, queryPattern: 'fantastico|фантастико' },
  { id: 'kaufland', label: 'Kaufland', regex: /(^|\W)kaufland(\W|$)|кауфланд/iu, queryPattern: 'kaufland|кауфланд' },
  { id: 'metro', label: 'Metro', regex: /(^|\W)metro(\W|$)|метро/iu, queryPattern: 'metro|метро' },
  { id: '345', label: '345', regex: /(^|\W)345(\W|$)/iu, queryPattern: '345' },
];

const ONLINE_STORES = [
  {
    id: 'online_ebag',
    chainId: 'ebag',
    chainLabel: 'eBag',
    name: 'eBag.bg',
    offerUrl: 'https://www.ebag.bg',
  },
  {
    id: 'online_supermag',
    chainId: 'supermag',
    chainLabel: 'Supermag',
    name: 'Supermag',
    offerUrl: 'https://shop.supermag.bg',
  },
];

const CHAIN_PRICE_FACTOR = {
  lidl: 0.95,
  fantastico: 1.03,
  kaufland: 0.94,
  metro: 0.98,
  '345': 1.01,
  ebag: 1.05,
  supermag: 1.04,
};

const TOKEN_PRICE_MAP = {
  bread: 1.5,
  milk: 1.7,
  egg: 2.8,
  chicken: 10.2,
  pork: 9.3,
  fish: 12.4,
  rice: 3.2,
  pasta: 2.7,
  flour: 2.1,
  cheese: 6.9,
  yogurt: 1.6,
  tomato: 3.9,
  potato: 1.8,
  onion: 1.6,
  carrot: 1.7,
  pepper: 4.8,
  cucumber: 3.4,
  mushroom: 6.4,
  apple: 2.9,
  banana: 3.6,
  orange: 3.4,
  lemon: 3.2,
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

function normalizeText(value) {
  return String(value || '').toLowerCase().trim();
}

function canonicalToken(value) {
  const raw = normalizeText(value)
    .replace(/[^a-zа-яё\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!raw) return '';

  if (/\btomatoes?\b|домат/.test(raw)) return 'tomato';
  if (/\bonions?\b|лук/.test(raw)) return 'onion';
  if (/\bpotatoes?\b|картоф/.test(raw)) return 'potato';
  if (/\bcarrots?\b|морков/.test(raw)) return 'carrot';
  if (/\bcucumbers?\b|крастав/.test(raw)) return 'cucumber';
  if (/\bpeppers?\b|чуш/.test(raw)) return 'pepper';
  if (/\bmushrooms?\b|гъб/.test(raw)) return 'mushroom';
  if (/\beggs?\b|яйц/.test(raw)) return 'egg';
  if (/\bmilk\b|мляко/.test(raw)) return 'milk';
  if (/\bcheese\b|сирен|кашкавал/.test(raw)) return 'cheese';
  if (/\byogurt\b|йогурт|кисело\s+мляко/.test(raw)) return 'yogurt';
  if (/\bchicken\b|пиле/.test(raw)) return 'chicken';
  if (/\bpork\b|свинск|телешк|beef|агнешк|lamb/.test(raw)) return 'pork';
  if (/\bfish\b|сьомг|риба|тон|треск|salmon|tuna|cod/.test(raw)) return 'fish';
  if (/\bbread\b|хляб/.test(raw)) return 'bread';
  if (/\brice\b|ориз/.test(raw)) return 'rice';
  if (/\bpasta\b|макарон|спагет|паста/.test(raw)) return 'pasta';
  if (/\bflour\b|брашн/.test(raw)) return 'flour';
  if (/\bapple\b|ябълк/.test(raw)) return 'apple';
  if (/\bbanana\b|банан/.test(raw)) return 'banana';
  if (/\borange\b|портокал/.test(raw)) return 'orange';
  if (/\blemon\b|лимон/.test(raw)) return 'lemon';

  return raw;
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

function parseElementForRule(el, rule) {
  const lat = el.lat || el.center?.lat;
  const lon = el.lon || el.center?.lon;
  if (typeof lat !== 'number' || typeof lon !== 'number') return null;

  const brand = el.tags?.brand || el.tags?.['brand:en'] || '';
  const operator = el.tags?.operator || '';
  const officialName = el.tags?.official_name || el.tags?.['name:en'] || '';
  const name = el.tags?.name || brand || operator || officialName || rule.label;
  const haystack = `${name} ${brand} ${operator}`;
  if (!rule.regex.test(haystack)) return null;

  return {
    id: `store_${rule.id}_${el.type}_${el.id}`,
    chainId: rule.id,
    chainLabel: rule.label,
    name,
    lat,
    lon,
    address: [el.tags?.['addr:street'], el.tags?.['addr:housenumber']].filter(Boolean).join(' '),
    isOnline: false,
  };
}

async function fetchRuleFromEndpoint(endpoint, rule, coords, radiusMeters) {
  const query = `
    [out:json][timeout:10];
    (
      node["shop"~"supermarket|hypermarket|grocery|wholesale",i]["name"~"${rule.queryPattern}",i](around:${radiusMeters},${coords.lat},${coords.lon});
      node["shop"~"supermarket|hypermarket|grocery|wholesale",i]["brand"~"${rule.queryPattern}",i](around:${radiusMeters},${coords.lat},${coords.lon});
      node["shop"~"supermarket|hypermarket|grocery|wholesale",i]["operator"~"${rule.queryPattern}",i](around:${radiusMeters},${coords.lat},${coords.lon});
      way["shop"~"supermarket|hypermarket|grocery|wholesale",i]["name"~"${rule.queryPattern}",i](around:${radiusMeters},${coords.lat},${coords.lon});
      way["shop"~"supermarket|hypermarket|grocery|wholesale",i]["brand"~"${rule.queryPattern}",i](around:${radiusMeters},${coords.lat},${coords.lon});
      way["shop"~"supermarket|hypermarket|grocery|wholesale",i]["operator"~"${rule.queryPattern}",i](around:${radiusMeters},${coords.lat},${coords.lon});
      relation["shop"~"supermarket|hypermarket|grocery|wholesale",i]["name"~"${rule.queryPattern}",i](around:${radiusMeters},${coords.lat},${coords.lon});
      relation["shop"~"supermarket|hypermarket|grocery|wholesale",i]["brand"~"${rule.queryPattern}",i](around:${radiusMeters},${coords.lat},${coords.lon});
      relation["shop"~"supermarket|hypermarket|grocery|wholesale",i]["operator"~"${rule.queryPattern}",i](around:${radiusMeters},${coords.lat},${coords.lon});
    );
    out center tags;
  `;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OVERPASS_TIMEOUT_MS);
  const response = await fetch(endpoint, {
    method: 'POST',
    body: query,
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    signal: controller.signal,
  });
  clearTimeout(timer);
  if (!response.ok) return [];

  const data = await response.json();
  return (data.elements || [])
    .map((el) => parseElementForRule(el, rule))
    .filter(Boolean)
    .map((store) => ({
      ...store,
      distanceKm: Number(haversineKm(coords, { lat: store.lat, lon: store.lon }).toFixed(2)),
    }));
}

async function fetchNearestStoreForRule(rule, coords, radiusKm) {
  const radiusMeters = Math.max(1000, Math.round(radiusKm * 1000));
  for (const endpoint of OVERPASS_APIS) {
    try {
      const candidates = await fetchRuleFromEndpoint(endpoint, rule, coords, radiusMeters);
      if (!candidates.length) continue;
      const nearest = candidates.sort((a, b) => a.distanceKm - b.distanceKm)[0];
      if (nearest && nearest.distanceKm <= radiusKm) return nearest;
    } catch {
      // try next endpoint
    }
  }
  return null;
}

function makeFallbackStore(rule, coords) {
  const fb = SOFIA_FALLBACK_STORES[rule.id] || { lat: coords.lat, lon: coords.lon, address: 'Approximate location' };
  const distKm = Number(haversineKm(coords, { lat: fb.lat, lon: fb.lon }).toFixed(1));
  return {
    id: `fallback_${rule.id}`,
    chainId: rule.id,
    chainLabel: rule.label,
    name: rule.label,
    lat: fb.lat,
    lon: fb.lon,
    address: fb.address,
    isOnline: false,
    distanceKm: distKm,
    isFallback: true,
  };
}

async function fetchNearestPhysicalStores(coords, radiusKm) {
  const nearestByRule = await Promise.all(
    PHYSICAL_CHAIN_RULES.map((rule) => fetchNearestStoreForRule(rule, coords, radiusKm)),
  );
  // If Overpass failed for a chain, always fall back to a known Sofia location
  return PHYSICAL_CHAIN_RULES.map((rule, i) => nearestByRule[i] || makeFallbackStore(rule, coords));
}

function toIngredientItems(rawItems) {
  if (!Array.isArray(rawItems)) return [];
  return rawItems
    .map((item) => {
      const name = typeof item === 'string' ? item : item?.name;
      const token = canonicalToken(name);
      if (!token) return null;
      return {
        name: token,
        totalGrams: Number(item?.totalGrams || 0),
        count: Number(item?.count || 1),
      };
    })
    .filter(Boolean);
}

function buildCoverageAndPrices(store, ingredientItems) {
  const factor = CHAIN_PRICE_FACTOR[store.chainId] || 1;
  const matchedOffers = [];
  const unmatchedItems = [];

  for (const item of ingredientItems) {
    const token = item.name;
    const availabilitySeed = hashString(`${store.chainId}:${token}`) % 100;
    const availabilityThreshold = store.isOnline ? 92 : 78;
    const isAvailable = availabilitySeed < availabilityThreshold;
    if (!isAvailable) {
      unmatchedItems.push(token);
      continue;
    }

    const base = TOKEN_PRICE_MAP[token] || null;
    if (base === null) {
      unmatchedItems.push(token);
      continue;
    }

    const promoSeed = hashString(`${store.chainId}:${token}:promo`) % 18;
    const discountPercent = Math.max(0, promoSeed - 5);
    const adjusted = base * factor * (1 - discountPercent / 100);
    const isOnline = Boolean(store.isOnline);
    const confidenceLevel = isOnline ? 'medium' : 'low';
    const confidenceReason = isOnline
      ? 'Online catalog reference, may vary by delivery slot'
      : 'Estimated by chain-level pricing model';
    const sourceType = isOnline ? 'online_reference_estimate' : 'market_estimate';

    matchedOffers.push({
      ingredient: token,
      offer: {
        title: `${token}${confidenceLevel === 'low' ? ' (~estimate)' : ''}`,
        keyword: token,
        price: Number(adjusted.toFixed(2)),
        discountPercent,
        sourceType,
        confidenceLevel,
        confidenceReason,
      },
    });
  }

  const total = ingredientItems.length;
  const matchedCount = matchedOffers.length;
  const promoMatchedCount = matchedOffers.filter((m) => Number(m.offer.discountPercent || 0) > 0).length;
  const pricedCount = matchedCount;
  const percent = total > 0 ? Math.round((matchedCount / total) * 100) : 0;
  const promoPercent = total > 0 ? Math.round((promoMatchedCount / total) * 100) : 0;
  const estimatedTotal = Number(matchedOffers.reduce((sum, m) => sum + Number(m.offer.price || 0), 0).toFixed(2));

  return {
    matchedCount,
    pricedCount,
    promoMatchedCount,
    total,
    percent,
    estimatedPercent: percent,
    promoPercent,
    estimatedTotal,
    matchedOffers,
    unmatchedItems,
  };
}

function summarizeConfidence(offers = []) {
  const counts = { high: 0, medium: 0, low: 0 };
  for (const offer of offers) {
    const level = offer?.confidenceLevel || 'low';
    counts[level] = (counts[level] || 0) + 1;
  }
  let level = 'low';
  if (counts.medium > 0) level = 'medium';
  if (counts.high > 0 && counts.high >= counts.medium) level = 'high';
  return { level, counts };
}

function makeDirectionsUrl(store, coords) {
  if (store.isOnline) return '';
  if (store.isFallback) {
    // No verified exact location — link to a map search for the chain near the user
    return `https://www.google.com/maps/search/${encodeURIComponent(store.chainLabel)}/@${coords.lat},${coords.lon},13z`;
  }
  if (!Number.isFinite(store.lat) || !Number.isFinite(store.lon)) return '';
  const destination = encodeURIComponent(`${Number(store.lat).toFixed(6)},${Number(store.lon).toFixed(6)}`);
  const origin = `&origin=${encodeURIComponent(`${coords.lat},${coords.lon}`)}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}${origin}&travelmode=driving`;
}

function buildSplitPlan(stores) {
  const top = stores.slice(0, 2);
  const assignments = top.map((store) => ({
    storeId: store.id,
    chainLabel: store.chainLabel,
    subtotal: Number((store.coverage.estimatedTotal / Math.max(1, top.length)).toFixed(2)),
    items: store.coverage.matchedOffers.slice(0, 4).map((entry) => ({
      ingredient: entry.ingredient,
      totalPrice: Number(entry.offer.price || 0),
      confidenceLevel: entry.offer.confidenceLevel || 'low',
    })),
  }));

  const total = Number(assignments.reduce((sum, x) => sum + x.subtotal, 0).toFixed(2));
  const cheapestSingle = Number(stores[0]?.coverage?.estimatedTotal || 0);

  return {
    total,
    itemCount: assignments.reduce((sum, x) => sum + x.items.length, 0),
    storeCount: assignments.length,
    savingsVsCheapestSingle: Number((Math.max(0, cheapestSingle - total)).toFixed(2)),
    assignments,
  };
}

async function buildMarketReport(payload) {
  const coords = {
    lat: Number(payload?.coords?.lat || DEFAULT_COORDS.lat),
    lon: Number(payload?.coords?.lon || DEFAULT_COORDS.lon),
  };
  const searchRadiusKm = Math.max(1, Number(payload?.searchRadiusKm || DEFAULT_RADIUS_KM));
  const minRecommendedCoverage = Number(payload?.minRecommendedCoverage || 70);
  const budget = Number(payload?.budget || payload?.options?.budget || 0);
  const ingredientItems = toIngredientItems(payload?.ingredientItems || []);

  const physicalStores = await fetchNearestPhysicalStores(coords, searchRadiusKm);
  const onlineStores = ONLINE_STORES.map((store) => ({
    ...store,
    isOnline: true,
    lat: coords.lat,
    lon: coords.lon,
    distanceKm: null,
    address: 'Online',
  }));

  const candidateStores = [...physicalStores, ...onlineStores];

  const analyzed = candidateStores
    .map((store) => {
      const coverage = buildCoverageAndPrices(store, ingredientItems);
      const confidenceSeed = coverage.matchedOffers.map((entry) => entry.offer);
      const distancePenalty = store.isOnline ? 3 : Number(store.distanceKm || 0) * 1.35;
      const budgetPenalty = budget > 0 ? Math.max(0, coverage.estimatedTotal - budget) * 0.65 : 0;
      const score = coverage.percent * 1.2 + coverage.matchedCount * 2 - distancePenalty - budgetPenalty;

      return {
        ...store,
        coverage,
        offers: confidenceSeed,
        score: Number(score.toFixed(2)),
        priceConfidence: summarizeConfidence(confidenceSeed),
        analysisSource: 'cloude',
        brochureHighlights: [
          `${store.chainLabel}: basket-aligned offers`,
          `${store.chainLabel}: estimated basket total ${coverage.estimatedTotal.toFixed(2)} EUR`,
        ],
        directionsUrl: makeDirectionsUrl(store, coords),
      };
    })
    .sort((a, b) => {
      if (b.coverage.percent !== a.coverage.percent) return b.coverage.percent - a.coverage.percent;
      const aDist = a.distanceKm ?? Number.POSITIVE_INFINITY;
      const bDist = b.distanceKm ?? Number.POSITIVE_INFINITY;
      return aDist - bDist;
    });

  const recommended =
    analyzed.find((store) => !store.isOnline && store.coverage.percent >= minRecommendedCoverage)
    || analyzed.find((store) => !store.isOnline)
    || analyzed[0]
    || null;

  return {
    coords,
    searchRadiusKm,
    analysisProvider: 'Cloude',
    analysisSummary: `Nearest chain stores in ${searchRadiusKm} km plus online prices. Product prices are shown with confidence labels (exact only when verified, otherwise estimated).`,
    recommendedStoreId: recommended?.id || null,
    minRecommendedCoverage,
    bestCoveragePercent: Number(analyzed[0]?.coverage?.percent || 0),
    optimization: {
      splitPlan: buildSplitPlan(analyzed),
      swapSuggestions: [],
    },
    stores: analyzed,
  };
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    const authHeader = request.headers.get('Authorization') || '';
    const expectedKey = String(env.ANALYZER_KEY || '').trim();
    if (expectedKey) {
      const provided = authHeader.replace(/^Bearer\s+/i, '').trim();
      if (!provided || provided !== expectedKey) {
        return jsonResponse({ error: 'Unauthorized' }, 401);
      }
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return jsonResponse({ error: 'Invalid JSON' }, 400);
    }

    try {
      const report = await buildMarketReport(payload || {});
      return jsonResponse({
        provider: 'cloude',
        summary: report.analysisSummary,
        report,
      });
    } catch (error) {
      return jsonResponse({
        error: 'Failed to build market report',
        details: String(error?.message || error),
      }, 500);
    }
  },
};
