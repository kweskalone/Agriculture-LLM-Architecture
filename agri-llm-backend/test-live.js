/**
 * Live smoke test for the Agriculture LLM Backend.
 *
 * Usage:
 *   node test-live.js                                   # tests the Render URL below
 *   node test-live.js <url>                             # test a different URL
 *   node test-live.js <url> <apiKey>                    # pass the API key directly
 *   $env:API_KEY="yourkey"; node test-live.js           # or via env var
 */

const BASE_URL = (process.argv[2] || 'https://agriculture-llm-backend.onrender.com').replace(/\/$/, '');
const API_KEY = process.argv[3] || process.env.API_KEY || '';

const headers = { 'Content-Type': 'application/json' };
if (API_KEY) headers['x-api-key'] = API_KEY;

const sample = {
  disease: 'Tomato___Late_blight',
  crop: 'Tomato',
  confidence: 0.94,
};

async function main() {
  console.log(`Testing: ${BASE_URL}`);
  console.log(
    API_KEY
      ? `API key: present (length ${API_KEY.length})\n`
      : 'API key: NONE being sent — this is why you get 401\n'
  );

  // 1) Health
  console.log('1) GET /health ...');
  try {
    const res = await fetch(`${BASE_URL}/health`);
    const body = await res.json();
    console.log(`   status ${res.status}:`, JSON.stringify(body));
    if (!body.llm || !body.llm.reachable) {
      console.log('   NOTE: llm.reachable is false — is the Colab notebook running?');
    }
  } catch (err) {
    console.log('   FAILED:', err.message);
  }

  // 2) Advice (the request YOLO will send)
  console.log('\n2) POST /api/v1/advice ...');
  console.log('   (first call can take up to ~60s while the model generates)');
  const started = Date.now();
  try {
    const res = await fetch(`${BASE_URL}/api/v1/advice`, {
      method: 'POST',
      headers,
      body: JSON.stringify(sample),
    });
    const body = await res.json();
    const secs = ((Date.now() - started) / 1000).toFixed(1);
    console.log(`   status ${res.status} in ${secs}s:`);
    console.log(JSON.stringify(body, null, 2));
  } catch (err) {
    console.log('   FAILED:', err.message);
  }
}

main();
