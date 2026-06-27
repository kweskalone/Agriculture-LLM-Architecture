const config = require('./config');
const { createApp } = require('./app');
const { createProvider } = require('./services/llm');
const { CacheService } = require('./services/cache/cacheService');

const provider = createProvider();
const cache = new CacheService({ ttlSeconds: config.cacheTtl, file: config.cacheFile });
const app = createApp({ provider, cache });

app.listen(config.port, () => {
  console.log(`Agriculture LLM Backend listening on port ${config.port}`);
  console.log(`LLM provider: ${provider.name} (${config.agrillmUrl || 'no URL set'})`);
});
