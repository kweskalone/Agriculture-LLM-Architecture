const fs = require('fs');
const path = require('path');

function normalizeKey({ disease, crop, language }) {
  return [disease, crop || '', language || 'en']
    .map((p) => String(p).trim().toLowerCase())
    .join('|');
}

class CacheService {
  constructor({ ttlSeconds = 604800, file = null, maxEntries = 500 } = {}) {
    this.ttlMs = ttlSeconds * 1000;
    this.file = file;
    this.maxEntries = maxEntries;
    this.store = new Map();
    this._load();
  }

  _load() {
    if (!this.file) return;
    try {
      const abs = path.resolve(this.file);
      if (!fs.existsSync(abs)) return;
      const raw = JSON.parse(fs.readFileSync(abs, 'utf-8'));
      const now = Date.now();
      for (const [key, entry] of Object.entries(raw)) {
        if (entry && entry.expiresAt > now) {
          this.store.set(key, entry);
        }
      }
    } catch {
      // Corrupt/unreadable cache file is non-fatal; start with an empty cache.
    }
  }

  _persist() {
    if (!this.file) return;
    try {
      const obj = Object.fromEntries(this.store.entries());
      fs.writeFileSync(path.resolve(this.file), JSON.stringify(obj), 'utf-8');
    } catch {
      // Persistence is best-effort; ignore write failures.
    }
  }

  get(keyParts) {
    const key = normalizeKey(keyParts);
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }
    // Refresh LRU recency.
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(keyParts, value) {
    const key = normalizeKey(keyParts);
    const entry = { value, expiresAt: Date.now() + this.ttlMs };
    this.store.delete(key);
    this.store.set(key, entry);
    while (this.store.size > this.maxEntries) {
      const oldest = this.store.keys().next().value;
      this.store.delete(oldest);
    }
    this._persist();
    return value;
  }

  clear() {
    this.store.clear();
    this._persist();
  }
}

module.exports = { CacheService, normalizeKey };
