const { buildPrompt } = require('./promptBuilder');
const { parseModelOutput } = require('./parseResponse');

class LLMUnavailableError extends Error {
  constructor(message) {
    super(message);
    this.name = 'LLMUnavailableError';
    this.code = 'LLM_UNAVAILABLE';
  }
}

async function postWithTimeout(url, body, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`Upstream responded ${res.status}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function createAgrillmProvider({ url, timeoutMs = 60000, fetchImpl } = {}) {
  const doFetch = fetchImpl || ((u, b, t) => postWithTimeout(u, b, t));

  return {
    name: 'agrillm-phi4',

    async generateAdvice(input) {
      if (!url) {
        throw new LLMUnavailableError('AGRILLM_URL is not configured.');
      }
      const prompt = buildPrompt(input);
      const endpoint = `${url}/generate`;

      let lastErr;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const data = await doFetch(endpoint, { prompt }, timeoutMs);
          const rawText =
            (data && (data.text || data.output || data.response)) || '';
          return parseModelOutput(rawText);
        } catch (err) {
          lastErr = err;
        }
      }
      throw new LLMUnavailableError(
        `AgriLLM service is not reachable: ${lastErr ? lastErr.message : 'unknown error'}`
      );
    },

    async health() {
      if (!url) return { reachable: false, reason: 'AGRILLM_URL not set' };
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(`${url}/health`, { signal: controller.signal });
        clearTimeout(timer);
        return { reachable: res.ok };
      } catch (err) {
        return { reachable: false, reason: err.message };
      }
    },
  };
}

module.exports = { createAgrillmProvider, LLMUnavailableError };
