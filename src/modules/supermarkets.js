import { getBasketIngredients } from './basket.js';

const DEFAULT_COORDS = { lat: 42.6977, lon: 23.3219 }; // Sofia fallback
const OVERPASS_API = 'https://overpass-api.de/api/interpreter';
const LIVE_OFFERS_TIMEOUT_MS = 2500;
const CACHE_TTL_MS = 10 * 60 * 1000;
const storesCache = new Map();
const offersCache = new Map();

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
    id: 'cba',
    label: 'CBA',
    aliases: ['cba'],
    offerPage: 'https://cbamarket.bg/',
  },
  {
    id: 'chain345',
    label: '345',
    aliases: ['345', 'триста четиридесет и пет'],
    offerPage: 'https://345.bg/',
  },
  {
    id: 'fresco',
    label: 'FRESCO',
    aliases: ['fresco'],
    offerPage: 'https://fresco.bg/',
  },
  {
    id: 'ebag_online',
    label: 'EBAG.bg (Online)',
    aliases: ['ebag', 'ebag.bg'],
    offerPage: 'https://www.ebag.bg/promotions',
    onlineOnly: true,
  },
  {
    id: 'supermag_online',
    label: 'Supermag (Online)',
    aliases: ['supermag'],
    offerPage: 'https://supermag.bg/',
    onlineOnly: true,
  },
  {
    id: 'glovo_market_online',
    label: 'Glovo Market (Online)',
    aliases: ['glovo market', 'glovo'],
    offerPage: 'https://glovoapp.com/bg/bg/sofiya/',
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
  cba: [
    { keyword: 'tomato', title: 'Домати CBA', price: 1.19 },
    { keyword: 'onion', title: 'Лук кромид', price: 0.57 },
    { keyword: 'potato', title: 'Картофи', price: 0.74 },
    { keyword: 'chicken', title: 'Пилешко филе', price: 5.09 },
    { keyword: 'egg', title: 'Яйца 10 бр.', price: 2.06 },
    { keyword: 'milk', title: 'Прясно мляко', price: 1.12 },
    { keyword: 'rice', title: 'Ориз', price: 1.26 },
    { keyword: 'pasta', title: 'Паста', price: 0.98 },
  ],
  chain345: [
    { keyword: 'tomato', title: 'Домати 345', price: 1.14 },
    { keyword: 'cucumber', title: 'Краставици 345', price: 0.81 },
    { keyword: 'pepper', title: 'Чушки', price: 1.06 },
    { keyword: 'bread', title: 'Хляб', price: 0.89 },
    { keyword: 'cheese', title: 'Сирене', price: 2.49 },
    { keyword: 'banana', title: 'Банани', price: 1.11 },
    { keyword: 'yogurt', title: 'Кисело мляко', price: 0.88 },
    { keyword: 'bean', title: 'Боб', price: 1.28 },
  ],
  fresco: [
    { keyword: 'tomato', title: 'Домати FRESCO', price: 1.25 },
    { keyword: 'broccoli', title: 'Броколи', price: 1.15 },
    { keyword: 'mushroom', title: 'Гъби', price: 1.78 },
    { keyword: 'salmon', title: 'Сьомга филе', price: 7.20 },
    { keyword: 'pork', title: 'Свинско месо', price: 4.85 },
    { keyword: 'egg', title: 'Яйца 10 бр.', price: 2.19 },
    { keyword: 'milk', title: 'Мляко 1L', price: 1.15 },
    { keyword: 'pasta', title: 'Италианска паста', price: 1.24 },
  ],
  supermag_online: [
    { keyword: 'tomato', title: 'Домати online', price: 1.29 },
    { keyword: 'potato', title: 'Картофи online', price: 0.75 },
    { keyword: 'chicken', title: 'Пилешко филе online', price: 5.29 },
    { keyword: 'rice', title: 'Ориз online', price: 1.35 },
    { keyword: 'milk', title: 'Мляко online', price: 1.19 },
    { keyword: 'egg', title: 'Яйца online', price: 2.15 },
  ],
  glovo_market_online: [
    { keyword: 'tomato', title: 'Домати Glovo', price: 1.33 },
    { keyword: 'onion', title: 'Лук Glovo', price: 0.62 },
    { keyword: 'banana', title: 'Банани Glovo', price: 1.19 },
    { keyword: 'bread', title: 'Хляб Glovo', price: 1.05 },
    { keyword: 'cheese', title: 'Сирене Glovo', price: 2.69 },
    { keyword: 'pasta', title: 'Паста Glovo', price: 1.32 },
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
    return 'beef';
  }
  if (/\bpork\b|свинск/.test(raw)) {
    return 'pork';
  }
  if (/\blamb\b|агнешк/.test(raw)) {
    return 'lamb';
  }
  if (/\bsalmon\b|сьомг/.test(raw)) {
    return 'salmon';
  }
  if (/\bcod\b|треск/.test(raw)) {
    return 'cod';
  }
  if (/\btuna\b|тон/.test(raw)) {
    return 'tuna';
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

function dedupeStoreKey(store) {
  // Overpass can return the same physical store as node/way/relation.
  // Use chain + coarse coordinates + normalized name to collapse duplicates.
  const roundedLat = Number(store.lat).toFixed(4);
  const roundedLon = Number(store.lon).toFixed(4);
  const name = normalizeText(store.name || store.chainLabel || '');
  return `${store.chainId}:${roundedLat}:${roundedLon}:${name}`;
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
  const cacheKey = `${Number(coords.lat).toFixed(3)}:${Number(coords.lon).toFixed(3)}:${useFallbackOnly ? 1 : 0}`;
  const cacheHit = storesCache.get(cacheKey);
  if (cacheHit && Date.now() - cacheHit.ts < CACHE_TTL_MS) {
    return cacheHit.value;
  }

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
    [out:json][timeout:12];
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
      const key = dedupeStoreKey(store);
      if (!deduped.has(key)) {
        deduped.set(key, store);
      }
    }

    const result = Array.from(deduped.values());
    storesCache.set(cacheKey, { ts: Date.now(), value: result });
    return result;
  } catch {
    const fallback = CHAIN_DEFS.filter((chain) => !chain.onlineOnly).map((chain) => ({
      id: `${chain.id}_fallback`,
      chainId: chain.id,
      chainLabel: chain.label,
      name: chain.label,
      lat: coords.lat,
      lon: coords.lon,
      address: '',
      isFallback: true,
    }));
    storesCache.set(cacheKey, { ts: Date.now(), value: fallback });
    return fallback;
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
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), LIVE_OFFERS_TIMEOUT_MS);
    const response = await fetch(proxyUrl, { signal: controller.signal });
    clearTimeout(timer);
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

  const signature = ingredientNames
    .map((name) => canonicalToken(name))
    .filter(Boolean)
    .sort()
    .join('|');
  const cacheKey = `${chainId}:${useFallbackOnly ? 'fallback' : 'live'}:${signature}`;
  const cacheHit = offersCache.get(cacheKey);
  if (cacheHit && Date.now() - cacheHit.ts < CACHE_TTL_MS) {
    return cacheHit.value;
  }

  if (useFallbackOnly) {
    const fallbackOnly = FALLBACK_OFFERS[chainId] || [];
    offersCache.set(cacheKey, { ts: Date.now(), value: fallbackOnly });
    return fallbackOnly;
  }

  const text = await fetchOfferText(chain.offerPage);
  const live = extractLiveOffers(text, ingredientNames);
  if (live.length > 0) {
    const liveTop = live.slice(0, 30);
    offersCache.set(cacheKey, { ts: Date.now(), value: liveTop });
    return liveTop;
  }

  const fallback = (FALLBACK_OFFERS[chainId] || []).map((offer) => ({
    ...offer,
    source: 'fallback',
  }));
  offersCache.set(cacheKey, { ts: Date.now(), value: fallback });
  return fallback;
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
  const assortmentMatchedNames = new Set();
  const pricedNames = new Set();
  const matchedOffers = [];
  const unmatchedItems = [];
  let estimatedTotal = 0;

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
  // Offer-based % — varies meaningfully by chain (was inflated by common assortment before)
  const offerPercent = total > 0 ? Math.round((offerMatchedNames.size / total) * 100) : 0;
  // Estimated % including common assortment (optimistic upper bound)
  const estimatedPercent = total > 0
    ? Math.round(((offerMatchedNames.size + assortmentMatchedNames.size) / total) * 100)
    : 0;

  return {
    matchedCount: offerMatchedNames.size,
    promoMatchedCount: offerMatchedNames.size,
    total,
    percent: offerPercent,
    estimatedPercent,
    promoPercent: offerPercent,
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

  const coords = forceFallbackCoords
    ? { ...DEFAULT_COORDS, isFallback: true }
    : await getUserCoords();
  const shouldUseFallbackOnly = useFallbackOnly || forceFallbackCoords;
  const nearbyStores = await fetchNearbyChains(coords, { useFallbackOnly: shouldUseFallbackOnly });

  const neededChainIds = new Set(nearbyStores.map((store) => store.chainId));
  for (const chain of CHAIN_DEFS) {
    if (chain.onlineOnly) {
      neededChainIds.add(chain.id);
    }
  }

  const offerEntries = await Promise.all(
    Array.from(neededChainIds).map(async (chainId) => {
      const offers = await getChainOffers(chainId, ingredientNames, {
        useFallbackOnly: shouldUseFallbackOnly,
      });
      return [chainId, offers];
    }),
  );
  const offersByChain = Object.fromEntries(offerEntries);

  const enriched = nearbyStores.map((store) => {
    const offers = offersByChain[store.chainId] || [];
    const coverage = getCoverage(offers, ingredientItems);
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

  const onlineChains = CHAIN_DEFS.filter((chain) => chain.onlineOnly);
  for (const onlineChain of onlineChains) {
    const onlineOffers = offersByChain[onlineChain.id] || [];
    if (shouldUseFallbackOnly || onlineOffers.length > 0) {
      const onlineCoverage = getCoverage(onlineOffers, ingredientItems);
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
