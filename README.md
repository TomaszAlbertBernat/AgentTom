# AgentTom AGI

AgentTom is an AI agent server built with Bun, Hono, and Drizzle (SQLite). It provides tool-augmented reasoning, document handling, and integrations (web, email, Linear, Spotify, etc.).

## Quick start

1) Install dependencies

```bash
bun install
```

2) Configure environment

 - Copy `.env-example` to `.env` and fill required values (at minimum set `APP_URL` and at least one LLM key: `GOOGLE_API_KEY` or `OPENAI_API_KEY`). In development, `API_KEY` can be disabled.
- Default port is 3000 (override with `PORT`).

3) Initialize database

```bash
bun generate      # drizzle-kit generate
bun migrate       # applies SQL migrations from src/database/migrations
bun seed          # seeds sample data (users, conversations, memories, example tools)
```

4) Run the server

```bash
bun run dev
```

- Server: `http://localhost:3000`
- API docs: `http://localhost:3000/docs`
 - On startup, the app logs a service configuration summary (required/optional providers) via `logServiceStatus()`.

## Environment

Key variables (see `.env-example` for the complete list):

- Core: `APP_URL`, `PORT`
- LLM: `GOOGLE_API_KEY` (default), `OPENAI_API_KEY` (fallback), `DEFAULT_LLM_PROVIDER`, `DEFAULT_TEXT_MODEL`, `FALLBACK_TEXT_MODEL`
- Optional providers: `ANTHROPIC_API_KEY`, `XAI_API_KEY`
- Langfuse: `LANGFUSE_SECRET_KEY`, `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_BASEURL`
- Search: `ALGOLIA_APP_ID`, `ALGOLIA_API_KEY`, `ALGOLIA_INDEX`
- Vector DB: `QDRANT_URL`, `QDRANT_API_KEY`, `QDRANT_INDEX`
- Google: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- Calendar app: `CALENDAR_CLIENT_ID`, `CALENDAR_CLIENT_SECRET`
- Web: `FIRECRAWL_API_KEY`
- Email: `RESEND_API_KEY`, `FROM_EMAIL`, `USER_EMAIL`
- Speech: `ELEVENLABS_API_KEY`
- Linear: `LINEAR_API_KEY`, `LINEAR_DEFAULT_TEAM_ID`, `LINEAR_DEFAULT_ASSIGNEE_ID`
- Spotify: `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`
- Crypto: `COIN_MARKET_CAP_API_KEY`
- Rate limit (optional): `REDIS_URL`
- JWT (required for AGI endpoints): `JWT_SECRET`
- Dev flags: `DISABLE_API_KEY` (default true in development), `APP_TIMEZONE` (default `Europe/Warsaw`)

Notes:
- The previous `ALGOLIA_INDEX_NAME` has been standardized to `ALGOLIA_INDEX`.
- The seed file uses `API_KEY` only to create a demo user token; global API auth uses a different mechanism (see below).
- LLM defaults: Gemini as default provider with automatic OpenAI fallback on rate limits; configurable via env.

## Authentication

- Global API middleware expects an API key in the `Authorization` header and validates it against the database `api_keys` table.
  - Format: `Authorization: Bearer <api_key>`
  - There is no public route to create API keys in this repository. Create one directly in the database using `src/services/common/api-key.service.ts` from a script, or disable the middleware during local development.
- In addition, AGI routes under `/api/agi/*` use JWT.
  - Obtain a JWT via `/api/auth/register` or `/api/auth/login`.

Important: In development you can set `DISABLE_API_KEY=true` to use JWT-only. In production, API-key validation remains enforced.

## API

Mounted routes:

- `/api/auth` — register/login and profile (`/register`, `/login`, `/me`)
- `/api/agi` — simple chat/conversation endpoints
  - `POST /api/agi/conversations` → create conversation
  - `POST /api/agi/messages` → send a message (stores history and returns model response)
- `/api/tools` — list and execute tools
  - `GET /api/tools` → list tools (with availability)
  - `POST /api/tools/execute` → execute a tool by name
- `/api/users` — user CRUD (admin-style list/get/update)
- `/api/linear` — Linear helper endpoints (`/projects`, `/states`, `/teams`, `/users`, `/setup`)
- `/docs` — Swagger UI served from the in-repo OpenAPI spec

Notes:
- The following additional routes are mounted: `files`, `memory`, `text`, `web`, `spotify`.

## Tools & integrations

Implemented tool services (accessible via `/api/tools/execute`):

- memory, web (Firecrawl), resend (email), file (load/write/upload), speak (system/ElevenLabs), linear, map, crypto (CoinMarketCap), image, calendar, spotify

The tool registry is in `src/config/tools.config.ts`. Tool payloads are validated against schemas in `src/config/tool-schemas.ts`.

Seeding: The default seed adds example tools (weather/calculator/translator) to demonstrate the DB structure. These examples are not implemented services. Use the tools listed above via the tools API or add your own to the registry and seed.

## Models

Supported model IDs are configured in `src/config/llm.config.ts` (e.g., `gpt-4o`, `gpt-4o-mini`, `o1-preview`, `o1-mini`, `claude-3-5-sonnet-latest`).

## Development notes

- Port: defaults to 3000; override with `PORT`.
- OpenAPI: `GET /docs` (served from `src/config/openapi.config.ts`).
- Rate limiting: uses Redis via `ioredis`. If you enable it, ensure a Redis instance and add `ioredis` to dependencies, or disable the middleware locally.
 - Startup logs include a services matrix to quickly verify which integrations are configured.

## License

This repo is mainly for personal use. Feel free to explore and adapt ideas for your projects. Please do not copy the entire project under the original name.
