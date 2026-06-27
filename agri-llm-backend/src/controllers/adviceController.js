const { humanizeDisease } = require('../services/llm/promptBuilder');

function createAdviceController({ provider, cache }) {
  return async function adviceController(req, res, next) {
    const { disease, crop, confidence, language = 'en' } = req.validatedBody;
    const keyParts = { disease, crop, language };

    try {
      const cached = cache.get(keyParts);
      if (cached) {
        return res.json({ ...cached, cached: true });
      }

      let advice;
      try {
        advice = await provider.generateAdvice({ disease, crop, confidence, language });
      } catch (err) {
        // Provider down: serve stale cache if we somehow have it, else bubble to 503.
        const fallback = cache.get(keyParts);
        if (fallback) return res.json({ ...fallback, cached: true, stale: true });
        return next(err);
      }

      const payload = {
        disease: humanizeDisease(disease),
        crop: crop || null,
        confidence: typeof confidence === 'number' ? confidence : null,
        severity: advice.severity,
        explanation: advice.explanation,
        treatment: advice.treatment,
        prevention: advice.prevention,
        language,
        source: provider.name,
      };

      cache.set(keyParts, payload);
      return res.json(payload);
    } catch (err) {
      return next(err);
    }
  };
}

module.exports = { createAdviceController };
