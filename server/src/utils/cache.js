const cache = new Map();
const defaults = { ttl: 60_000 };

export const get = (key) => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value;
};

export const set = (key, value, ttl = defaults.ttl) => {
  cache.set(key, { value, expiresAt: Date.now() + ttl });
};

export const del = (pattern) => {
  if (!pattern) { cache.clear(); return; }
  for (const key of cache.keys()) {
    if (key.includes(pattern)) cache.delete(key);
  }
};
