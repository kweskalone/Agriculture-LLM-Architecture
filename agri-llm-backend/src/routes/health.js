const express = require('express');

function createHealthRouter({ provider }) {
  const router = express.Router();
  router.get('/health', async (req, res) => {
    let llm = { reachable: false };
    if (provider && typeof provider.health === 'function') {
      llm = await provider.health();
    }
    res.json({ status: 'ok', llm });
  });
  return router;
}

module.exports = { createHealthRouter };
