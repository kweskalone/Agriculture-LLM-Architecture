const { CacheService, normalizeKey } = require('../src/services/cache/cacheService');

describe('CacheService', () => {
  test('normalizeKey is case-insensitive and stable', () => {
    const a = normalizeKey({ disease: 'Tomato_Blight', crop: 'Tomato', language: 'EN' });
    const b = normalizeKey({ disease: 'tomato_blight', crop: 'tomato', language: 'en' });
    expect(a).toBe(b);
  });

  test('set then get returns the value', () => {
    const cache = new CacheService({ ttlSeconds: 60 });
    const key = { disease: 'd', crop: 'c', language: 'en' };
    cache.set(key, { explanation: 'hello' });
    expect(cache.get(key)).toEqual({ explanation: 'hello' });
  });

  test('miss returns null', () => {
    const cache = new CacheService({ ttlSeconds: 60 });
    expect(cache.get({ disease: 'nope' })).toBeNull();
  });

  test('expired entries are evicted', () => {
    const cache = new CacheService({ ttlSeconds: 0 });
    const key = { disease: 'd' };
    cache.set(key, { x: 1 });
    expect(cache.get(key)).toBeNull();
  });

  test('respects maxEntries (LRU eviction)', () => {
    const cache = new CacheService({ ttlSeconds: 60, maxEntries: 2 });
    cache.set({ disease: 'a' }, { v: 1 });
    cache.set({ disease: 'b' }, { v: 2 });
    cache.set({ disease: 'c' }, { v: 3 });
    expect(cache.get({ disease: 'a' })).toBeNull();
    expect(cache.get({ disease: 'c' })).toEqual({ v: 3 });
  });
});
