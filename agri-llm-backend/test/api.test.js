const request = require('supertest');
const { createApp } = require('../src/app');
const { CacheService } = require('../src/services/cache/cacheService');
const { LLMUnavailableError } = require('../src/services/llm/agrillmProvider');

function makeProvider(overrides = {}) {
  return {
    name: 'agrillm-phi4',
    generateAdvice: jest.fn(async () => ({
      explanation: 'Late blight is a fungal disease.',
      treatment: ['Apply fungicide'],
      prevention: ['Rotate crops'],
      severity: 'Severe',
    })),
    health: jest.fn(async () => ({ reachable: true })),
    ...overrides,
  };
}

function makeApp(provider) {
  const cache = new CacheService({ ttlSeconds: 60 });
  return { app: createApp({ provider, cache }), cache };
}

const VALID = { disease: 'Tomato___Late_blight', crop: 'Tomato', confidence: 0.94 };

describe('POST /api/v1/advice', () => {
  test('returns structured advice on success', async () => {
    const provider = makeProvider();
    const { app } = makeApp(provider);

    const res = await request(app).post('/api/v1/advice').send(VALID);

    expect(res.status).toBe(200);
    expect(res.body.disease).toBe('Tomato Late blight');
    expect(res.body.severity).toBe('Severe');
    expect(res.body.treatment).toContain('Apply fungicide');
    expect(res.body.source).toBe('agrillm-phi4');
    expect(res.body.language).toBe('en');
  });

  test('rejects invalid body with 400', async () => {
    const provider = makeProvider();
    const { app } = makeApp(provider);

    const res = await request(app).post('/api/v1/advice').send({ crop: 'Tomato' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(provider.generateAdvice).not.toHaveBeenCalled();
  });

  test('second identical request is served from cache (provider called once)', async () => {
    const provider = makeProvider();
    const { app } = makeApp(provider);

    await request(app).post('/api/v1/advice').send(VALID);
    const res2 = await request(app).post('/api/v1/advice').send(VALID);

    expect(res2.status).toBe(200);
    expect(res2.body.cached).toBe(true);
    expect(provider.generateAdvice).toHaveBeenCalledTimes(1);
  });

  test('returns 503 when provider is unavailable and no cache', async () => {
    const provider = makeProvider({
      generateAdvice: jest.fn(async () => {
        throw new LLMUnavailableError('AgriLLM service is not reachable.');
      }),
    });
    const { app } = makeApp(provider);

    const res = await request(app).post('/api/v1/advice').send(VALID);

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('LLM_UNAVAILABLE');
  });
});

describe('auth', () => {
  test('401 when API key is required but missing', async () => {
    const provider = makeProvider();
    const cache = new CacheService({ ttlSeconds: 60 });
    jest.resetModules();
    jest.doMock('../src/config', () => ({ apiKey: 'secret', cacheTtl: 60 }));
    const authMw = require('../src/middleware/auth');
    const express = require('express');
    const app = express();
    app.use(express.json());
    app.post('/protected', authMw, (req, res) => res.json({ ok: true }));

    const res = await request(app).post('/protected').send({});
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
    jest.dontMock('../src/config');
  });
});

describe('GET /health', () => {
  test('reports status and llm reachability', async () => {
    const provider = makeProvider();
    const { app } = makeApp(provider);

    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.llm.reachable).toBe(true);
  });
});
