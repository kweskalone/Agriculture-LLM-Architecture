require('dotenv').config();

const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  apiKey: process.env.API_KEY || '',
  llmProvider: process.env.LLM_PROVIDER || 'agrillm',
  agrillmUrl: (process.env.AGRILLM_URL || '').replace(/\/$/, ''),
  llmTimeoutMs: parseInt(process.env.LLM_TIMEOUT_MS || '60000', 10),
  cacheTtl: parseInt(process.env.CACHE_TTL || '604800', 10),
  cacheFile: process.env.CACHE_FILE || './cache.json',
};

module.exports = config;
