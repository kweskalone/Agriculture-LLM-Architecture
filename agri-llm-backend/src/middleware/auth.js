const config = require('../config');

function auth(req, res, next) {
  // If no API key is configured, auth is disabled (useful for local dev).
  if (!config.apiKey) return next();

  const provided = req.get('x-api-key');
  if (!provided || provided !== config.apiKey) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Missing or invalid API key.' },
    });
  }
  return next();
}

module.exports = auth;
