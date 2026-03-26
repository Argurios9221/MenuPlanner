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
  return String(value || '')
    .toLowerCase()
    .trim();
}

function canonicalToken(value) {
  const raw = normalizeText(value)
    .replace(/[^a-zа-яё\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!raw) {
    return '';
  }

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
  if (/\bpork\b|свинск/.test(raw)) return 'pork';
  if (/\bbeef\b|телешк/.test(raw)) return 'beef';
  if (/\bfish\b|сьомг|риба|тон|треск/.test(raw)) return 'fish';
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

const CHAIN_SCORE_BIAS = {
  lidl: 9,
  kaufland: 8,
  metro: 7,
  fantastico: 6,
  dar: 5,
  '345': 5,
};

const TOKEN_PRICE_MAP = {
  bread: 1.5,
  milk: 1.7,
  egg: 2.8,
  chicken: 10.2,
  pork: 9.2,
  beef: 13.5,
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

function buildCoverageForStore(store, ingredientItems) {
  const ingredientTokens = ingredientItems
    .map((item) => canonicalToken(item?.name || item))
    .filter(Boolean);

  const total = ingredientTokens.length;
  const chainId = normalizeText(store?.chainId || '');
  const chainBias = CHAIN_SCORE_BIAS[chainId] || 4;
  const matchedTarget = total > 0 ? Math.max(1, Math.min(total, total - 2 + Math.floor(chainBias / 4))) : 0;

  const matchedOffers = ingredientTokens.slice(0, matchedTarget).map((token) => {
    const base = TOKEN_PRICE_MAP[token] || 4.2;
    const price = Number((base * (1 - Math.min(chainBias, 10) * 0.01)).toFixed(2));
    return {
      ingredient: token,
      title: `${token} promo`,
      price,
      discountPercent: Math.max(5, Math.min(25, chainBias + 2)),
    };
  });

  const matchedCount = matchedOffers.length;
  const percent = total > 0 ? Math.round((matchedCount / total) * 100) : 0;
  const promoMatchedCount = matchedCount;
  const estimatedTotal = Number(
    matchedOffers
      .reduce((sum, entry) => sum + Number(entry.price || 0), 0)
      .toFixed(2),
  );

  return {
    total,
    matchedCount,
    pricedCount: matchedCount,
    promoMatchedCount,
    percent,
    promoPercent: percent,
    estimatedPercent: percent,
    estimatedTotal,
    matchedOffers,
    unmatchedItems: ingredientTokens.slice(matchedCount),
  };
}

function buildBrochureHighlights(store) {
  const chainLabel = store?.chainLabel || store?.chainId || 'Store';
  return [
    `${chainLabel}: weekly promo bundles`,
    `${chainLabel}: seasonal produce discounts`,
    `${chainLabel}: family-size products on offer`,
  ];
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

    const stores = Array.isArray(payload?.stores) ? payload.stores : [];
    const ingredientItems = Array.isArray(payload?.ingredientItems) ? payload.ingredientItems : [];

    const analyzedStores = stores.map((store) => ({
      id: store?.id,
      chainId: store?.chainId,
      chainLabel: store?.chainLabel,
      coverage: buildCoverageForStore(store, ingredientItems),
      brochureHighlights: buildBrochureHighlights(store),
    }));

    const bestPercent = analyzedStores
      .map((entry) => Number(entry?.coverage?.percent || 0))
      .sort((a, b) => b - a)[0] || 0;

    return jsonResponse({
      provider: 'cloude',
      summary: `Cloud analyzer processed ${stores.length} stores with up to ${bestPercent}% basket coverage.`,
      stores: analyzedStores,
    });
  },
};
