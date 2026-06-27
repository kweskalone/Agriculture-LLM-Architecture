const { z } = require('zod');

const adviceRequestSchema = z.object({
  disease: z.string().min(1, 'disease is required'),
  crop: z.string().min(1).optional(),
  confidence: z.number().min(0).max(1).optional(),
  language: z.string().min(2).max(10).optional().default('en'),
});

module.exports = { adviceRequestSchema };
