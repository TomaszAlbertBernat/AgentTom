## Tech Stack

### Core
- **Runtime**: Bun
- **Language**: TypeScript
- **Package manager**: Bun (bun.lockb)
- **Architecture**: Hono server with modular routes, services, middleware

### Web/API
- **HTTP framework**: Hono
- **API documentation**: Swagger UI (OpenAPI served from `src/config/openapi.config.ts`)
- **Validation**: Zod + `@hono/zod-validator`
- **Middleware**:
  - CORS (custom, env-driven)
  - Auth (JWT + optional API key; dev bypass supported)
  - Rate limiting (Redis-backed, optional)
  - Request sanitization
  - Pretty JSON + request logging

### Auth & Security
- **JWT**: `jsonwebtoken`
- **Password hashing**: `bcryptjs`
- **Input validation**: Zod
- **CORS**: allowlist and headers configuration

### Database & Migrations
- **ORM**: Drizzle ORM
- **Primary DB**: SQLite (runtime via libSQL, migrations via Bun SQLite)
- **Clients**: `@libsql/client` (runtime), `drizzle-orm/bun-sqlite/migrator` (migrations)
- **Schema**: Drizzle tables in `src/schema/*`
- **Migrations**: SQL files in `src/database/migrations`

### Data & Search
- **Vector DB**: Qdrant (`@qdrant/js-client-rest`)
  - Default collection configured via env (`QDRANT_INDEX`), 3072-dim vectors
- **Text search**: Algolia (`algoliasearch`)
- **Hybrid search**: RRF fusion of Qdrant + Algolia in `search.service.ts`

### Caching & Rate Limiting
- **Cache service**: Redis (optional; dynamic `ioredis` require guarded by `REDIS_URL`)
- **Rate limit middleware**: Redis-backed counters and headers (no-op when Redis absent)

### AI & LLM
- **SDK**: `ai` (provider-agnostic)
- **Providers**:
  - OpenAI (`openai`) – required in typical setups
  - Anthropic (`@ai-sdk/anthropic`) – optional
  - XAI (key supported in env; provider optional)
- **Tokenization**: `@microsoft/tiktokenizer`
- **Prompts**: maintained under `src/prompts/*`

### Observability & Monitoring
- **Tracing/observability**: Langfuse (`langfuse`)
- **Structured logging**: custom logger (`src/services/common/logger.service.ts`) with levels (ERROR→TRACE), JSON/text
- **Startup service check**: `logServiceStatus()` logs configured integrations; JSON via `/api/web/health/details`

### Media & Files
- **Storage**: Local filesystem (`STORAGE_PATH`)
- **Uploads**: MIME validation from `src/config/mime.config.ts`
- **HTML/Markdown**: `node-html-parser`, `marked`
- **Audio**: `fluent-ffmpeg` (+ types)

### Third-party Integrations (Tools)
- **Web scraping**: Firecrawl (`@mendable/firecrawl-js`)
- **Maps**: Google Maps Services (`@googlemaps/google-maps-services-js`)
- **Email**: Resend (`resend`)
- **Text-to-speech**: ElevenLabs (`elevenlabs`)
- **Music**: Spotify Web API TS SDK (`@spotify/web-api-ts-sdk`)
- **Project management**: Linear SDK (`@linear/sdk`)
- **YouTube transcripts**: HTML parsing + caption track extraction

### Testing & Tooling
- **Tests**: `bun test` (unit tests under `tests/`)
- **Types**: `@types/*`, `tsconfig.json`
- **Spellcheck**: `cspell.json`

### Environment & Config
- **Env validation**: Zod schema in `src/config/env.config.ts`
- **OpenAPI config**: `src/config/openapi.config.ts`
- **Tools registry & schemas**: `src/config/tools.config.ts`, `src/config/tool-schemas.ts`

### Scripts
- `dev`: start dev server with watch
- `start`: start server
- `generate`: drizzle-kit generate
- `migrate`: run SQL migrations
- `seed`: seed sample data
- `test`, `test:watch`, `test:coverage`: run unit tests

### Routes (not exhaustive)
- `/docs` – Swagger UI
- `/api/auth/*` – register, login, me
- `/api/agi/*` – AGI conversation endpoints
- `/api/tools/*` – list & execute tools
- `/api/files`, `/api/memory`, `/api/text`, `/api/web`, `/api/spotify`, `/api/linear`
- `/api/web/health`, `/api/web/health/details` – health endpoints

### Optional Services
- **Redis** (rate limit/cache): enable with `REDIS_URL` and install `ioredis` in production
- **Algolia, Qdrant, Langfuse, Firecrawl, ElevenLabs, Linear, Spotify, Google**: gated by env; surfaced in health details


