const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';
const DEFAULT_COORDS = { lat: 42.6977, lon: 23.3219 }; // Sofia fallback

let _weatherCache = null;

async function getCoords() {
  if (!navigator.geolocation) {
    return { ...DEFAULT_COORDS, isFallback: true };
  }

  try {
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 10 * 60 * 1000,
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

export async function getWeatherHint() {
  if (_weatherCache && Date.now() - _weatherCache.ts < 30 * 60 * 1000) {
    return _weatherCache.data;
  }

  const coords = await getCoords();
  const url = new URL(OPEN_METEO_URL);
  url.searchParams.set('latitude', String(coords.lat));
  url.searchParams.set('longitude', String(coords.lon));
  url.searchParams.set('current', 'temperature_2m,precipitation,weather_code');
  url.searchParams.set('timezone', 'auto');

  try {
    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    const current = data?.current || {};

    const temperature = Number(current.temperature_2m || 0);
    const precipitation = Number(current.precipitation || 0);
    const weatherCode = Number(current.weather_code || 0);

    const hint = {
      temperature,
      precipitation,
      weatherCode,
      isCold: temperature <= 10,
      isHot: temperature >= 28,
      isRainy: precipitation > 0.2 || [51, 53, 55, 61, 63, 65, 80, 81, 82].includes(weatherCode),
      isFallback: coords.isFallback,
    };

    _weatherCache = { ts: Date.now(), data: hint };
    return hint;
  } catch {
    return {
      temperature: 18,
      precipitation: 0,
      weatherCode: 0,
      isCold: false,
      isHot: false,
      isRainy: false,
      isFallback: true,
    };
  }
}

/**
 * Get meal category recommendations based on weather
 * Returns: 'hot', 'light', 'comfort'
 */
export function getWeatherMealCategory(hint) {
  if (!hint) return 'balanced';

  // Rainy → comfort meals
  if (hint.isRainy) {
    return 'comfort';
  }

  // Cold → hot meals
  if (hint.isCold) {
    return 'hot';
  }

  // Hot → light meals
  if (hint.isHot) {
    return 'light';
  }

  return 'balanced';
}

/**
 * Get meal keyword filters based on weather category
 */
export function getWeatherMealKeywords(category) {
  const keywords = {
    light: ['salad', 'vegetable', 'fresh', 'cold', 'smoothie', 'gazpacho'],
    hot: ['soup', 'stew', 'roasted', 'baked', 'warm', 'curry', 'chili', 'broiled'],
    comfort: ['pasta', 'rice', 'potato', 'comfort', 'creamy', 'cheese', 'pie', 'risotto'],
    balanced: [],
  };
  return keywords[category] || [];
}

/**
 * Get weather description for UI
 */
export function getWeatherDescription(hint) {
  if (!hint) return '🌤️ No data';

  const { temperature, precipitation, isCold, isHot, isRainy } = hint;

  if (isRainy) {
    return `🌧️ Rainy, ${Math.round(temperature)}°C`;
  } else if (isHot) {
    return `☀️ Hot, ${Math.round(temperature)}°C`;
  } else if (isCold) {
    return `❄️ Cold, ${Math.round(temperature)}°C`;
  } else {
    return `🌤️ Mild, ${Math.round(temperature)}°C`;
  }
}

/**
 * Get meal suggestion text
 */
export function getWeatherMealSuggestion(category) {
  const suggestions = {
    light: '💡 Light & fresh meals recommended today',
    hot: '🔥 Warm & hearty meals recommended today',
    comfort: '🍲 Comfort meals recommended today',
    balanced: '⚖️ Perfect weather for any meal!',
  };
  return suggestions[category] || suggestions.balanced;
}
