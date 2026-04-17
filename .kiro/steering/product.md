# Product: AI 결정 도우미 (AI Decision Helper)

A web app that recommends the best activity for a user based on their current state (fatigue, mood, weather, budget, time, etc.).

## Core Flow
1. User fills in up to 10 optional state fields (dropdowns) plus a free-text note
2. Backend selects a recommendation engine (rule-based or AI)
3. Result is displayed with: recommendation, reason, alternatives, related YouTube link, Unsplash images, and a nearby places map (OpenStreetMap via Leaflet + Overpass API)

## Engines
- **Rule-based** (default): Matches input against predefined scenarios using a scoring system
- **AI** (optional): Calls a Groq/OpenAI-compatible LLM (default: `llama3-8b-8192`) to generate a contextual recommendation; falls back to rule engine on failure

## Language
UI and server logs are in Korean. Code identifiers and comments may mix Korean and English.
