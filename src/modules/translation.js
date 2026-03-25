// Recipe translation service using MyMemory API
import { getCachedTranslation, cacheCachedTranslation } from './storage.js';

const MYMEMORY_API = 'https://api.mymemory.translated.net/get';
const MAX_TRANSLATION_CHUNK = 450;

const bgGlossary = [
  ['\\badd\\b', 'добавете'],
  ['\\bmix\\b', 'смесете'],
  ['\\bstir\\b', 'разбъркайте'],
  ['\\bcook\\b', 'гответе'],
  ['\\bbake\\b', 'печете'],
  ['\\bboil\\b', 'сварете'],
  ['\\bfry\\b', 'изпържете'],
  ['\\bgrill\\b', 'изпечете на скара'],
  ['\\bheat\\b', 'загрейте'],
  ['\\bserve\\b', 'сервирайте'],
  ['\\bchop\\b', 'нарежете'],
  ['\\bslice\\b', 'нарежете на филийки'],
  ['\\bdice\\b', 'нарежете на кубчета'],
  ['\\bmince\\b', 'накълцайте'],
  ['\\bseason\\b', 'овкусете'],
  ['\\bsimmer\\b', 'оставете да къкри'],
  ['\\bminutes?\\b', 'минути'],
  ['\\bhours?\\b', 'часа'],
  ['\\bcup\\b', 'чаша'],
  ['\\btbsp\\b', 'с.л.'],
  ['\\btsp\\b', 'ч.л.'],
  ['\\bpinch\\b', 'щипка'],
  ['\\bsalt\\b', 'сол'],
  ['\\bpepper\\b', 'пипер'],
  ['\\bonion\\b', 'лук'],
  ['\\bgarlic\\b', 'чесън'],
  ['\\bchicken\\b', 'пиле'],
  ['\\bbeef\\b', 'говеждо'],
  ['\\bpork\\b', 'свинско'],
  ['\\bpotato(?:es)?\\b', 'картофи'],
  ['\\btomato(?:es)?\\b', 'домати'],
  ['\\bcheese\\b', 'сирене'],
  ['\\bmilk\\b', 'мляко'],
  ['\\bbutter\\b', 'масло'],
  ['\\bflour\\b', 'брашно'],
  ['\\bsugar\\b', 'захар'],
  ['\\beggs?\\b', 'яйца'],
  ['\\brice\\b', 'ориз'],
  ['\\bpasta\\b', 'паста'],
  ['\\bolive oil\\b', 'зехтин'],
  ['\\boil\\b', 'олио'],
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hasCyrillic(text) {
  return /[\u0400-\u04FF]/.test(String(text || ''));
}

function splitTextIntoChunks(text, maxLen = MAX_TRANSLATION_CHUNK) {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length <= 1 && text.length <= maxLen) {
    return [text];
  }

  const chunks = [];
  let current = '';

  for (const sentence of sentences) {
    if (!sentence) {
      continue;
    }

    if ((current + ' ' + sentence).trim().length > maxLen && current) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += (current ? ' ' : '') + sentence;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks.length > 0 ? chunks : [text];
}

function applyBulgarianGlossary(text) {
  let out = text;
  for (const [pattern, replacement] of bgGlossary) {
    out = out.replace(new RegExp(pattern, 'gi'), replacement);
  }
  return out;
}

export async function translateText(text, targetLang = 'bg') {
  if (!text || text.trim().length === 0) {
    return text;
  }
  if (targetLang === 'en') {
    return text;
  } // No translation needed

  // Check cache first
  const cached = getCachedTranslation(text, targetLang);
  if (cached && (targetLang !== 'bg' || hasCyrillic(cached) || cached !== text)) {
    return cached;
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const params = new URLSearchParams({
        q: text,
        langpair: `en|${targetLang}`,
      });

      const response = await fetch(`${MYMEMORY_API}?${params}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.responseStatus === 200) {
        const primary = data.responseData?.translatedText || '';
        const bestMatch = (data.matches || []).find(
          (item) => item?.translation && item.translation.trim() && item.translation !== text
        )?.translation;

        const translation = (primary && primary !== text ? primary : bestMatch) || text;
        const normalized = targetLang === 'bg' ? applyBulgarianGlossary(translation) : translation;
        const accepted =
          targetLang !== 'bg'
            ? normalized
            : normalized !== text || hasCyrillic(normalized)
              ? normalized
              : applyBulgarianGlossary(text);
        cacheCachedTranslation(text, targetLang, accepted);
        return accepted;
      }
    } catch (error) {
      if (attempt === 2) {
        console.error('Translation error:', error);
      }
    }

    await sleep(150 * (attempt + 1));
  }

  return targetLang === 'bg' ? applyBulgarianGlossary(text) : text;
}

export async function translateInstructions(instructions, targetLang = 'bg') {
  if (targetLang === 'en') {
    return instructions;
  }

  const rawParts = String(instructions)
    .split(/\r?\n+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const parts = rawParts.length > 0 ? rawParts : [instructions];
  const translatedParts = [];

  // Sequential translation reduces rate-limit failures for long recipe instructions.
  for (const part of parts) {
    const chunks = splitTextIntoChunks(part);
    const translatedChunks = [];
    for (const chunk of chunks) {
      const translated = await translateText(chunk, targetLang);
      translatedChunks.push(translated);
    }
    const joined = translatedChunks.join(' ').trim();
    translatedParts.push(targetLang === 'bg' ? applyBulgarianGlossary(joined) : joined);
  }

  return translatedParts.join('\n\n').trim();
}

export async function translateLongText(text, targetLang = 'bg') {
  if (targetLang === 'en') {
    return text;
  }

  const chunks = splitTextIntoChunks(text);
  const translations = await Promise.all(chunks.map((chunk) => translateText(chunk, targetLang)));
  return translations.join(' ');
}

// Ingredient translation with fallback to dictionary
const ingredientDictionary = {
  en: {
    chicken: 'пилешко',
    beef: 'говеждо',
    pork: 'свинско',
    lamb: 'агнешко',
    turkey: 'пуйка',
    duck: 'патица',
    fish: 'риба',
    salmon: 'сьомга',
    tuna: 'тон',
    shrimp: 'креветки',
    prawn: 'скариди',
    cheese: 'сирене',
    milk: 'мляко',
    butter: 'масло',
    cream: 'сметана',
    eggs: 'яйца',
    egg: 'яйце',
    tomato: 'домат',
    tomatoes: 'домати',
    potato: 'картоф',
    potatoes: 'картофи',
    onion: 'лук',
    onions: 'лук',
    garlic: 'чесън',
    pepper: 'пипер',
    peppers: 'пипери',
    salt: 'сол',
    oil: 'масло',
    olive: 'маслина',
    bread: 'хлеб',
    pasta: 'паста',
    rice: 'ориз',
    flour: 'брашно',
    sugar: 'захар',
    honey: 'мед',
    vinegar: 'оцет',
    lemon: 'лимон',
    lime: 'лайм',
    orange: 'портокал',
    apple: 'ябълка',
    banana: 'банан',
    strawberry: 'ягода',
    basil: 'босилек',
    oregano: 'риган',
    thyme: 'мащерка',
    rosemary: 'розмарин',
    parmesan: 'пармезан',
    mozzarella: 'моцарела',
    black: 'черен',
    white: 'бял',
    ground: 'препечен',
    fresh: 'свеж',
    dried: 'сухеж',
  },
  bg: {},
};

export function translateIngredient(ingredientName, targetLang = 'bg') {
  if (targetLang === 'en') {
    return ingredientName;
  }

  const lower = ingredientName.toLowerCase();
  const dict = ingredientDictionary.en;

  // Try exact match first
  if (dict[lower]) {
    return dict[lower];
  }

  // Try partial matches
  for (const [key, value] of Object.entries(dict)) {
    if (lower.includes(key)) {
      return lower.replace(key, value);
    }
  }

  // Return original if no translation found
  return ingredientName;
}

export async function translateIngredientAsync(ingredientName, targetLang = 'bg') {
  if (!ingredientName || targetLang === 'en') {
    return ingredientName;
  }

  const dictTranslation = translateIngredient(ingredientName, targetLang);
  if (dictTranslation && dictTranslation !== ingredientName) {
    return dictTranslation;
  }

  return translateText(ingredientName, targetLang);
}
