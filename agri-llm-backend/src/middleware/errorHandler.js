// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const code = err.code === 'LLM_UNAVAILABLE' ? 'LLM_UNAVAILABLE' : 'INTERNAL_ERROR';
  const status = code === 'LLM_UNAVAILABLE' ? 503 : 500;

  if (status >= 500) {
    console.error(`[${code}]`, err.message);
  }

  res.status(status).json({
    error: { code, message: err.message || 'Unexpected server error.' },
  });
}

module.exports = errorHandler;
