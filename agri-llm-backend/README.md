# Agriculture LLM Backend

Part of the **Multilingual Agricultural AI Assistant (AgriScan)** system.

This service receives a detected plant disease from the **YOLO disease-detection backend** and
returns **structured agricultural advice** (explanation, treatment, prevention, severity) to the
**Main Router**. The language model behind it is pluggable; the current provider calls an **AgriLLM**
model (`DARJYO/darjyo-AgriLLM-GRPO`, Phi-4) hosted on a free Colab/Kaggle GPU.

```
YOLO backend  ──▶  Agriculture LLM Backend  ──▶  Main Router
                          │
                          ▼
                 AgriLLM inference (Colab GPU via ngrok tunnel)
```

> Twi translation is a **future** phase. The response contract already includes a `language` field
> and structured fields so a Twi LLM can translate later without breaking changes.

## Tech stack

- **Node.js + Express** — HTTP API
- **zod** — request validation
- **Jest + supertest** — tests (LLM mocked, no GPU needed)
- **Python (FastAPI) on Colab** — AgriLLM inference service (`colab/agrillm_server.ipynb`)

## Project layout

```
src/
  server.js              bootstrap (listens on PORT)
  app.js                 express app factory (dependency-injected, testable)
  routes/                advice.js, health.js
  controllers/           adviceController.js
  services/
    llm/                 index.js (factory), agrillmProvider.js, promptBuilder.js, parseResponse.js
    cache/               cacheService.js  (in-memory LRU + JSON-file persistence)
  middleware/            auth.js, validate.js, errorHandler.js
  schemas/               adviceSchema.js
  config/                index.js
test/                    parseResponse / cacheService / api tests
colab/agrillm_server.ipynb   the AgriLLM inference notebook
```

## Setup

```bash
cd agri-llm-backend
npm install
cp .env.example .env   # then edit values
```

### Environment variables (`.env`)

| Variable | Meaning | Default |
|---|---|---|
| `PORT` | API port | `3000` |
| `API_KEY` | Shared secret expected in the `x-api-key` header. Leave blank to disable auth (local dev). | _(empty)_ |
| `LLM_PROVIDER` | Active provider | `agrillm` |
| `AGRILLM_URL` | Public URL of the Colab tunnel | _(none)_ |
| `LLM_TIMEOUT_MS` | Per-call timeout | `60000` |
| `CACHE_TTL` | Cache time-to-live (seconds) | `604800` (7 days) |
| `CACHE_FILE` | Path for persisted cache | `./cache.json` |

## Running the AgriLLM model (free GPU)

1. Open `colab/agrillm_server.ipynb` in **Google Colab**.
2. `Runtime -> Change runtime type -> T4 GPU`.
3. Add a free **ngrok authtoken** in the last cell.
4. Run all cells. Copy the printed `https://....ngrok-free.app` URL.
5. Put it in your backend `.env` as `AGRILLM_URL` and start the backend.

> Colab GPUs are ephemeral: they disconnect after ~90 min idle and the URL changes on restart.
> This is fine for development/demos. Cached answers keep working even when the GPU is down.

## Running the backend

```bash
npm start        # production
npm run dev      # auto-reload (node --watch)
npm test         # run the test suite
```

## API

### `POST /api/v1/advice`

Headers: `x-api-key: <API_KEY>` (if configured)

Request (from YOLO):
```json
{
  "disease": "Tomato___Late_blight",
  "crop": "Tomato",
  "confidence": 0.94,
  "language": "en"
}
```

Response (to Router):
```json
{
  "disease": "Tomato Late blight",
  "crop": "Tomato",
  "confidence": 0.94,
  "severity": "Severe",
  "explanation": "...",
  "treatment": ["...", "..."],
  "prevention": ["...", "..."],
  "language": "en",
  "source": "agrillm-phi4"
}
```

Repeat requests for the same `disease|crop|language` are served from cache and include `"cached": true`.

### `GET /health`

```json
{ "status": "ok", "llm": { "reachable": true } }
```

## Errors

| Status | `error.code` | When |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Bad/missing request fields |
| `401` | `UNAUTHORIZED` | Missing/invalid API key |
| `503` | `LLM_UNAVAILABLE` | AgriLLM unreachable and no cached answer |
| `404` | `NOT_FOUND` | Unknown route |
| `500` | `INTERNAL_ERROR` | Unexpected error |

## Swapping the model host later

The model lives behind a provider interface (`generateAdvice(...)`) created in
`src/services/llm/index.js`. To move from Colab to a paid GPU / managed endpoint, add a new provider
file and select it via `LLM_PROVIDER` — no route, controller, or contract changes needed.
