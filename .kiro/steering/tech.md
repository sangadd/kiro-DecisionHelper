# Tech Stack

## Runtime & Framework
- **Node.js** with **Express 4** (no TypeScript)
- **dotenv** for environment config
- **openai** SDK (v4) for Groq/OpenAI-compatible LLM calls

## Frontend
- Vanilla HTML/CSS/JS — no build step, no bundler
- **Leaflet 1.9** (CDN) for interactive maps
- **Pretendard** font (CDN)
- Fetches data from `/api/*` endpoints via `fetch()`

## External APIs
| API | Purpose | Env var |
|-----|---------|---------|
| Groq / OpenAI-compatible | LLM recommendations | `AI_API_KEY`, `AI_API_BASE_URL`, `AI_MODEL` |
| Unsplash | Result images | `UNSPLASH_ACCESS_KEY` |
| Overpass API | Nearby places (OSM) | none (public) |

## Environment Variables
See `.env.example`. Key vars:
- `RECOMMENDATION_ENGINE` — `"rule"` (default) or `"ai"`
- `AI_API_KEY` — required when engine is `"ai"`
- `AI_API_BASE_URL` — defaults to `https://api.groq.com/openai/v1`
- `AI_MODEL` — defaults to `llama3-8b-8192`
- `PORT` — defaults to `3000`

## Common Commands
```bash
npm start       # production: node server/index.js
npm run dev     # development: node --watch server/index.js
```
No test runner or build tool is configured.
