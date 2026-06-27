const express = require('express');
const { createAdviceRouter } = require('./routes/advice');
const { createHealthRouter } = require('./routes/health');
const errorHandler = require('./middleware/errorHandler');

function createApp({ provider, cache }) {
  const app = express();
  app.use(express.json({ limit: '256kb' }));

  app.use('/', createHealthRouter({ provider }));
  app.use('/api/v1', createAdviceRouter({ provider, cache }));

  app.use((req, res) => {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: `No route for ${req.method} ${req.path}` },
    });
  });

  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
