const config = require('../../config');
const { createAgrillmProvider } = require('./agrillmProvider');

function createProvider(overrides = {}) {
  const provider = overrides.provider || config.llmProvider;

  switch (provider) {
    case 'agrillm':
    default:
      return createAgrillmProvider({
        url: overrides.url || config.agrillmUrl,
        timeoutMs: overrides.timeoutMs || config.llmTimeoutMs,
        fetchImpl: overrides.fetchImpl,
      });
  }
}

module.exports = { createProvider };
