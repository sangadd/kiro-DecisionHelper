# Project Structure

```
/
├── public/               # Static frontend (served as-is)
│   ├── index.html        # Single-page app shell
│   ├── app.js            # All frontend logic (vanilla JS)
│   └── style.css         # All styles
│
├── server/
│   ├── index.js          # Express app entry point, middleware, route mounting
│   ├── selector.js       # Engine_Selector: picks rule or AI engine from env
│   │
│   ├── engines/
│   │   ├── interface.js  # JSDoc typedefs for UserInput / RecommendationResponse
│   │   ├── ruleEngine.js # Rule_Based_Engine: scenario array + scoring logic
│   │   └── aiEngine.js   # AI_Engine: LLM prompt builder + OpenAI SDK call
│   │
│   ├── middleware/
│   │   └── validator.js  # validateInput: checks enum values for all input fields
│   │
│   └── routes/
│       ├── recommend.js  # POST /api/recommend, GET /api/health
│       ├── images.js     # GET /api/images  (Unsplash proxy)
│       └── places.js     # GET /api/places  (Overpass OSM proxy)
│
├── .env                  # Local secrets (gitignored)
├── .env.example          # Env var template
└── package.json
```

## Key Conventions
- All API responses use `{ success: true, data: ... }` or `{ success: false, error: { message, details? } }`
- Every engine must export a `recommend(input)` async function returning `{ recommendation, reason, alternatives, keyword?, image_keyword? }`
- Input fields are all optional; `validator.js` only validates fields that are present
- Engine selection happens once at startup (`selector.js` is required at module load time in `recommend.js`)
- AI engine falls back to rule engine on any error
- New routes go in `server/routes/` and are mounted in `server/index.js` under `/api`
