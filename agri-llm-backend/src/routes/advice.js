const express = require('express');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { adviceRequestSchema } = require('../schemas/adviceSchema');
const { createAdviceController } = require('../controllers/adviceController');

function createAdviceRouter({ provider, cache }) {
  const router = express.Router();
  router.post(
    '/advice',
    auth,
    validate(adviceRequestSchema),
    createAdviceController({ provider, cache })
  );
  return router;
}

module.exports = { createAdviceRouter };
