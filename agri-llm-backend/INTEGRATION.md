# Integration Guide — Agriculture LLM Backend

This document is for the **YOLO detection team** and the **Main Router team**. It describes exactly how
to call the Agriculture LLM Backend.

```
YOLO backend ──▶ Agriculture LLM Backend ──▶ Main Router
```

## Base URL

- **Local:** `http://localhost:3000`
- **Production (Render):** `https://agriculture-llm-backend.onrender.com`

## Authentication

If the backend is deployed with an `API_KEY` set, send it on every `/api/v1/*` request:

```
x-api-key: <the shared key>
```

If no key is configured (local dev), the header is not required.

## Endpoint: `POST /api/v1/advice`

Turns a detected disease into structured agricultural advice.

### Request body

| Field | Type | Required | Notes |
|---|---|---|---|
| `disease` | string | **yes** | Disease label from YOLO (e.g. `Tomato___Late_blight`). Underscores are fine. |
| `crop` | string | no | Crop name if YOLO provides it. |
| `confidence` | number (0–1) | no | Detection confidence; passed through to the response. |
| `language` | string | no | Defaults to `en`. Reserved for future Twi support. |

```json
{
  "disease": "Tomato___Late_blight",
  "crop": "Tomato",
  "confidence": 0.94,
  "language": "en"
}
```

### Success response `200`

```json
{
  "disease": "Tomato Late blight",
  "crop": "Tomato",
  "confidence": 0.94,
  "severity": "Severe",
  "explanation": "Late blight is a fast-spreading fungal-like disease...",
  "treatment": ["Remove and destroy infected leaves", "Apply a copper-based fungicide"],
  "prevention": ["Avoid overhead watering", "Rotate crops each season"],
  "language": "en",
  "source": "agrillm-phi4",
  "cached": false
}
```

| Field | Meaning |
|---|---|
| `severity` | `Mild` \| `Moderate` \| `Severe` |
| `treatment` / `prevention` | arrays of short, actionable steps |
| `source` | which model produced the answer |
| `cached` | `true` if served from cache (omitted/false otherwise) |

### Error responses

All errors share this shape:

```json
{ "error": { "code": "LLM_UNAVAILABLE", "message": "AgriLLM service is not reachable." } }
```

| HTTP | `error.code` | When |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Missing/invalid fields (e.g. no `disease`) |
| `401` | `UNAUTHORIZED` | Missing/invalid `x-api-key` |
| `503` | `LLM_UNAVAILABLE` | Model service unreachable and no cached answer |
| `500` | `INTERNAL_ERROR` | Unexpected error |

> **Timing:** the first request for a given disease may take up to ~60s (model generating). Identical
> repeat requests return instantly from cache. Callers should use a timeout of **at least 60s**.

## Endpoint: `GET /health`

```json
{ "status": "ok", "llm": { "reachable": true } }
```

Use this for readiness checks and to confirm the model service is connected.

## Sample calls

**curl**
```bash
curl -X POST https://<your-service>.onrender.com/api/v1/advice \
  -H "Content-Type: application/json" \
  -H "x-api-key: <key>" \
  -d '{"disease":"Tomato___Late_blight","crop":"Tomato","confidence":0.94}'
```

**Python (what the YOLO backend might use)**
```python
import requests

resp = requests.post(
    "https://<your-service>.onrender.com/api/v1/advice",
    headers={"x-api-key": "<key>"},
    json={"disease": "Tomato___Late_blight", "crop": "Tomato", "confidence": 0.94},
    timeout=90,
)
advice = resp.json()
```

**JavaScript (Router)**
```js
const res = await fetch(`${BASE_URL}/api/v1/advice`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-api-key": KEY },
  body: JSON.stringify({ disease, crop, confidence }),
});
const advice = await res.json();
```
