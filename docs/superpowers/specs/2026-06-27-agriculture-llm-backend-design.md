# Agriculture LLM Backend — Design Spec

- **Date:** 2026-06-27
- **Status:** Approved (pending written-spec review)
- **Owner:** Kwesi
- **Part of:** Multilingual Agricultural AI Assistant System (AgriScan)

## 1. Purpose & Scope

The Agriculture LLM Backend is a hosted service that turns a **detected plant disease**
(produced by the YOLO disease-detection backend) into **human-readable agricultural advice**:
an explanation of the disease, recommended treatments, and prevention methods.

### In scope (this phase)
- A Node.js/Express HTTP API that receives a disease detection result and returns structured advice.
- Integration with the **AgriLLM** model (`DARJYO/darjyo-AgriLLM-GRPO`, Phi-4 ~14B) served on a free GPU.
- A pluggable LLM-provider layer so the model host can change without API changes.
- Response caching keyed by disease/crop/language.

### Out of scope (future phases)
- **Twi translation** (handled later by the separate Twi LLM service). The contract is designed so
  Twi translation can be added without breaking changes.
- The Main Router, the YOLO backend, the mobile app, and the marketplace — these are other components.
- Authentication of end users (this is a backend-to-backend service).

## 2. System Context

Current-phase flow (Twi deferred):

```
YOLO backend ──▶ Agriculture LLM Backend ──▶ Main Router
```

- **Caller:** YOLO backend (sends the detected disease).
- **Consumer:** Main Router (receives the structured advice).
- The team controls both YOLO and this backend, so the data contract is defined here.

## 3. Architecture

Two independent pieces:

### A. Agriculture LLM Backend (the deliverable)
- **Runtime:** Node.js + Express.
- **Responsibilities:** validate input, check cache, build the agriculture prompt, call the LLM
  provider, parse/structure the model output into the response contract, cache it, return it.
- **Hosting:** lightweight — can run locally or on a free always-on host (Render / Railway / HF Space).

### B. AgriLLM Inference Service
- **Runtime:** Python notebook on a free **Google Colab / Kaggle T4 (16 GB)** GPU.
- **Model:** `DARJYO/darjyo-AgriLLM-GRPO` (Phi-4 ~14B) loaded in 4-bit (bitsandbytes).
- **Interface:** a small FastAPI `POST /generate` endpoint.
- **Exposure:** public URL via an **ngrok / cloudflared** tunnel, pasted into the backend's `.env`.

### Pluggable provider
The model sits behind a provider interface (`generateAdvice(...)`). Today's implementation is
`AgriLLMProvider` (calls the Colab tunnel). Swapping to a paid GPU or another host later is a config
change only — YOLO and Router integrations never change.

### Known trade-off (free hosting)
Colab/Kaggle GPUs are **ephemeral**: they disconnect after ~90 min idle, cap sessions (~12 h), and the
tunnel URL changes on restart. This setup is suitable for **development and demos**, not 24/7 production.
The backend stays useful even when the GPU is down via caching and clear `503` errors.

## 4. Data Contract

### Request: YOLO → backend (`POST /api/v1/advice`)
```json
{
  "disease": "Tomato___Late_blight",
  "crop": "Tomato",
  "confidence": 0.94,
  "language": "en"
}
```
- `disease` (string, required) — disease label from YOLO.
- `crop` (string, optional) — crop name if YOLO provides it.
- `confidence` (number 0–1, optional) — detection confidence (passed through).
- `language` (string, optional, default `"en"`) — reserved for future Twi support.

### Response: backend → Router
```json
{
  "disease": "Tomato Late Blight",
  "crop": "Tomato",
  "confidence": 0.94,
  "severity": "Severe",
  "explanation": "....",
  "treatment": ["...", "..."],
  "prevention": ["...", "..."],
  "language": "en",
  "source": "agrillm-phi4"
}
```
- `treatment` and `prevention` are arrays of short, actionable steps.
- `severity` is one of `Mild` | `Moderate` | `Severe`.
- `source` identifies the model that produced the answer (useful when the provider changes).

### Error response (consistent shape)
```json
{ "error": { "code": "LLM_UNAVAILABLE", "message": "AgriLLM service is not reachable." } }
```

## 5. API Surface

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/v1/advice` | Main endpoint: disease in → advice out |
| `GET` | `/health` | Liveness + whether the AgriLLM tunnel is reachable |

- **Auth:** shared-secret `x-api-key` header on `/api/v1/*` (backend-to-backend). Configurable via `.env`.

## 6. LLM Provider & Prompting

- Provider interface: `generateAdvice({ disease, crop, confidence, language }) -> structuredAdvice`.
- `AgriLLMProvider`: HTTP `POST` to `AGRILLM_URL/generate` with a built prompt; timeout `LLM_TIMEOUT_MS`
  (~60 s); 1 retry on transient failure.
- **Prompt:** instructs AgriLLM to reply as a **strict JSON object**
  `{ explanation, treatment[], prevention[], severity }`.
- **Parsing:** primary parse expects JSON. A tolerant fallback parser extracts fields from loosely
  formatted text so a malformed model reply never crashes the API.

## 7. Caching

- **Key:** `disease|crop|language` (normalized lowercase).
- **Store:** in-memory LRU + optional JSON-file persistence (`CACHE_FILE`) so cache survives restarts
  (valuable given Colab's flakiness).
- **TTL:** `CACHE_TTL` (default e.g. 7 days — disease advice is stable).
- Cache hits skip the LLM entirely and return instantly.

## 8. Error Handling & Resilience

| Situation | Behavior |
|---|---|
| Invalid/missing body fields | `400` with validation detail |
| Missing/invalid API key | `401` |
| AgriLLM timeout/unreachable | Serve from cache if available; else `503` with clear error |
| Malformed model output | Tolerant parser recovers fields; never 500 from parsing |
| Unexpected error | Centralized error middleware → consistent JSON error |

Optional later: a small built-in static advice table for the most common diseases as a last-resort
fallback when the GPU is down and there's no cache.

## 9. Configuration (`.env`)

| Variable | Meaning |
|---|---|
| `PORT` | API port |
| `API_KEY` | Shared secret for `x-api-key` |
| `LLM_PROVIDER` | Active provider (`agrillm`) |
| `AGRILLM_URL` | Colab/Kaggle tunnel base URL |
| `LLM_TIMEOUT_MS` | Per-call timeout (default 60000) |
| `CACHE_TTL` | Cache time-to-live (seconds) |
| `CACHE_FILE` | Path for persisted cache (optional) |

## 10. Project Structure

```
agri-llm-backend/
  src/
    server.js              # bootstrap (listens on PORT)
    app.js                 # express app (exported for tests)
    routes/
      advice.js
      health.js
    controllers/
      adviceController.js
    services/
      llm/
        index.js           # provider factory
        agrillmProvider.js # calls Colab tunnel
        promptBuilder.js   # builds the agriculture prompt
        parseResponse.js   # strict + tolerant parsing
      cache/
        cacheService.js
    middleware/
      auth.js
      validate.js
      errorHandler.js
    schemas/
      adviceSchema.js
    config/
      index.js
  test/                    # jest + supertest
  colab/
    agrillm_server.ipynb   # the inference notebook
  .env.example
  package.json
  README.md
```

## 11. Testing Strategy

- **Framework:** Jest + supertest (LLM provider mocked — no GPU needed for tests).
- **Cases:** request validation; cache hit/miss; provider success path; provider-down → `503`;
  response parsing for well-formed and malformed model output; auth (missing/invalid key).

## 12. Future-Readiness

- `language` field + structured `explanation/treatment/prevention` let the **Twi LLM** translate later
  without contract changes.
- Pluggable provider lets the model host move to a paid GPU / managed endpoint later.
- `source` field lets the Router know which model produced an answer across host changes.
