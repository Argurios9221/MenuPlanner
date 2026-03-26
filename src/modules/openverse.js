const OPENVERSE_API = 'https://api.openverse.org/v1/images/';
const CACHE_TTL_MS = 2 * 60 * 60 * 1000;
const cache = new Map();

function buildKey(query) {
  return `ov_${String(query || '').trim().toLowerCase()}`;
}

function isValidEntry(entry) {
  return Boolean(entry) && Date.now() - entry.ts < CACHE_TTL_MS;
}

function withTimeout(promise, timeoutMs = 2200) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(null), timeoutMs)),
  ]);
}

export async function fetchOpenverseImage(query) {
  const needle = String(query || '').trim();
  if (!needle) {
    return null;
  }

  const key = buildKey(needle);
  const cached = cache.get(key);
  if (isValidEntry(cached)) {
    return cached.value;
  }

  try {
    const params = new URLSearchParams({
      q: needle,
      page_size: '1',
      mature: 'false',
      license_type: 'commercial,modification',
    });
    const response = await withTimeout(fetch(`${OPENVERSE_API}?${params.toString()}`));
    if (!response || !response.ok) {
      cache.set(key, { ts: Date.now(), value: null });
      return null;
    }

    const data = await response.json();
    const first = Array.isArray(data?.results) ? data.results[0] : null;
    const imageUrl = first?.thumbnail || first?.url || '';
    if (!imageUrl) {
      cache.set(key, { ts: Date.now(), value: null });
      return null;
    }

    const value = {
      url: imageUrl,
      source: 'openverse',
      title: first?.title || '',
      creator: first?.creator || '',
      license: first?.license || '',
    };
    cache.set(key, { ts: Date.now(), value });
    return value;
  } catch {
    cache.set(key, { ts: Date.now(), value: null });
    return null;
  }
}

export function clearOpenverseCache() {
  cache.clear();
}
