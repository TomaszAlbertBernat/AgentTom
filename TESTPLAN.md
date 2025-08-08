# AgentTom Test Plan

A practical, end-to-end test plan to verify AgentTom runs correctly locally and in CI. It covers environment, database, authentication, AGI flow, tools, and optional integrations.

## 1) Goals and Scope

- Verify the server boots, exposes health and docs endpoints
- Validate environment and database migrations/seeds
- Validate authentication flows (JWT + API key)
- Exercise AGI conversation endpoints
- Validate tools listing and error handling on execution
- Exercise optional integrations (Linear, Web/Firecrawl, Files, Spotify, Rate limit) when configured
- Provide CI steps to automate a smoke and unit suite

## 2) Environments

- Local: Bun runtime with SQLite file DB
- CI: ephemeral, headless run using `.env.test` and a throwaway DB file

## 3) Prerequisites

- Bun installed
- SQLite (bundled with Bun) available
- Minimal env set in `.env` or `.env.test`:
  - Required: `APP_URL=http://localhost:3000`, `API_KEY=...`, `OPENAI_API_KEY=...`
  - Recommended: `PORT=3000`, `JWT_SECRET=...`
  - Optional for features: `FIRECRAWL_API_KEY`, `LINEAR_API_KEY`, `REDIS_URL`, etc.
- Database initialized:
  - `bun generate`
  - `bun migrate` (or migrations run automatically at server start)
  - `bun seed`

Notes:
- Migrations run automatically at server start (see `src/index.ts`).
- Authentication uses JWT for user sessions and API keys for service access.
- Public auth endpoints: `/api/auth/register`, `/api/auth/login`, and `/api/auth/me` are exempted from the API-key middleware.
- AGI routes (`/api/agi/*`) are protected by the global API-key middleware and also require JWT.
  - Since a single request cannot carry two `Authorization` headers, for local testing do one of:
    - Option A (recommended): Temporarily scope the API-key middleware away from `/api/agi/*` in `src/app.ts`.
    - Option B: Temporarily disable the API-key middleware entirely in `src/app.ts`.
    - Option C: Implement a test-only bypass in the API-key middleware when `NODE_ENV=test`.
- Tools routes (`/api/tools/*`) require API key authentication.
- Rate limiting requires `ioredis` dependency and `REDIS_URL` - without these, requests pass through without limiting.

## 4) Test Data

- Seed data is provided via `bun seed` (users, conversations, memories, sample tools). The seeded tools (weather/calculator/translator) are examples and are not implemented in `toolsMap`.
- Create an API key for testing via a one-off script using `src/services/common/api-key.service.ts`:

```ts
// scripts/create-test-apikey.ts
import { apiKeyService } from '../src/services/common/api-key.service';

const main = async () => {
  // Use any existing userId from your users table; create one if needed
  const userId = 'test-user-id';
  const { key } = await apiKeyService.createApiKey({ userId, name: 'e2e', scopes: ['api:access'] });
  console.log(key);
};
main();
```

Run: `bun run scripts/create-test-apikey.ts` and export `SK` to reuse in curl.

## 5) Smoke Tests

- Health
  - GET `${APP_URL}/health`
  - Expect: 200 `{ "status": "ok" }`
- Docs
  - GET `${APP_URL}/docs`
  - Expect: Swagger UI is served
- OpenAPI JSON
  - GET `${APP_URL}/docs/openapi.json`
  - Expect: 200 with a valid JSON document

## 6) Authentication Tests

Headers reference:
- JWT: `-H "Authorization: Bearer $JWT"`
- API Key: `-H "Authorization: Bearer $SK"`

1) Register user (obtain JWT)
```bash
curl -s -X POST "$APP_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"tester@example.com","password":"passw0rd!","name":"Tester"}'
```
- Expect: 200 with `{ token: "<jwt>" }`

2) Login
```bash
curl -s -X POST "$APP_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"tester@example.com","password":"passw0rd!"}'
```
- Expect: 200 with `{ token }`

3) Me (requires JWT)
```bash
curl -s "$APP_URL/api/auth/me" -H "Authorization: Bearer $JWT"
```
- Expect: 200 with user profile

Negative cases:
- Invalid/expired JWT on `/api/auth/me` → 401
- Missing API key on `/api/tools/*` → 401

## 7) AGI Conversation Tests

Important: By default, AGI routes require BOTH a valid API key (global middleware) and a JWT. For testing with curl, scope the API-key middleware away from `/api/agi/*` or disable it (see notes in section 3).

1) Create conversation
```bash
curl -s -X POST "$APP_URL/api/agi/conversations" \
  -H "Authorization: Bearer $JWT"
```
- Expect: 200 `{ conversation_id: "uuid" }`

2) Send message
```bash
curl -s -X POST "$APP_URL/api/agi/messages" \
  -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d '{"content":"Hello","conversation_id":"<uuid-from-step-1>"}'
```
- Expect: 200 `{ conversation_id, response }` with model response

3) Get history
```bash
curl -s "$APP_URL/api/agi/conversations/<uuid>/messages" -H "Authorization: Bearer $JWT"
```
- Expect: 200 `{ messages: [...] }` (chronological)

Negative cases:
- Missing content → 400
- Conversation not found or not owned by user → 404
- Missing JWT → 401
- If API-key middleware is enabled for `/api/agi/*`, missing API key → 401

## 8) Tools API Tests

Tools routes require API key authentication.

1) List tools
```bash
curl -s "$APP_URL/api/tools" -H "Authorization: Bearer $SK"
```
- Expect: 200 with `tools` array and an `available` flag per tool. Seeded example tools (weather/calculator/translator) are examples and not implemented in `toolsMap` → `available: false`.

2) Execute a tool
- The endpoint forwards the provided `action` to the tool implementation and validates `parameters` against tool schemas.
```bash
curl -s -X POST "$APP_URL/api/tools/execute" \
  -H "Authorization: Bearer $SK" -H "Content-Type: application/json" \
  -d '{"tool_name":"web","action":"getContents","parameters":{"url":"https://example.com"}}'
```
- With `FIRECRAWL_API_KEY` set: Expect 200 with `{ success:true, result, execution_id }`.
- Without external env: Expect robust error (4xx/5xx) and an execution log accessible via `/api/tools/executions`.

3) Executions history
```bash
curl -s "$APP_URL/api/tools/executions" -H "Authorization: Bearer $SK"
```
- Expect: 200 with recent entries

4) Test error handling
```bash
curl -s -X POST "$APP_URL/api/tools/test-error-handling" \
  -H "Authorization: Bearer $SK" -H "Content-Type: application/json" \
  -d '{"test_type":"validation_error"}'
```
- Expect: 400 with structured error response

Negative cases:
- Missing API key → 401
- Invalid tool name → 404
- Invalid action → 400
- Tool execution timeout → 408

## 9) Linear Tests (optional)

Precondition: `LINEAR_API_KEY`
- GET `/api/linear/projects`, `/api/linear/states`, `/api/linear/teams`, `/api/linear/users`, `/api/linear/setup` with API key
- Expect: 200 with data; failures indicate env/config issues

## 10) Optional Mounted Routes

These route files exist but are not mounted in `src/app.ts` by default (except `linear`, which is already mounted). For testing, mount them, then run:

- Files
  - POST `/api/files/upload` (multipart) and `/api/files/upload/base64`
  - GET `/api/files/:uuid` → returns file content
- Web (Firecrawl)
  - POST `/api/web/get-contents` `{ url, conversation_uuid }`
  - POST `/api/web/search` `{ query, conversation_uuid }`
- Spotify (requires user tokens)
  - POST `/api/spotify` → returns auth URL, then test `/api/spotify/search` and `/api/spotify/play`
- Text
  - POST `/api/text/split` `{ text, chunk_size }`

## 11) Rate Limiting (optional)

Preconditions: Redis running and `ioredis` installed; `REDIS_URL` set.
- Hit `/api/tools` > `max` within `window` → expect 429 with `X-RateLimit-*` headers
- Without Redis configured, requests pass through (no limiting)

## 12) Unit Tests

Run unit suite:
```bash
bun test
```
- Expect existing tests in `tests/unit` to pass
- Add new unit tests for services as needed

## 13) CI Implementation

Suggested CI workflow steps:

1) Checkout and setup Bun
2) `bun install`
3) Copy `.env.example` → `.env.test` and set minimal secrets (no external providers for smoke)
4) `bun generate && bun migrate && bun test`
5) Start server in background with `.env.test`
6) Run smoke cURL against `/health` and `/docs/openapi.json`
7) Run auth flow using JWT-only endpoints (`/api/auth/*`)

Notes:
- Do not call external providers in CI unless secrets are provided in protected environments
- Use a separate DB file for CI to avoid clobbering local state (e.g., `agi.ci.db`)

## 14) Failure Triage (Known Gaps)

- Missing `ioredis` dependency: Rate limiting and caching require `ioredis` package. Add to `package.json` or disable when `REDIS_URL` not set.
- API key creation: No public endpoint to create API keys. Use the script in section 4 or create an admin endpoint.
- External provider env: Web tool requires `FIRECRAWL_API_KEY`; without it, expect controlled errors.
- Port/docs mismatch: Default port is 3000; ensure test scripts use `${APP_URL}`.
- Database schema: Ensure migrations are up-to-date and seed data matches current schema.

## 15) Acceptance Criteria

- Server starts with configured env and DB migrations/seeds
- `/health` and `/docs/openapi.json` return 200
- Auth: Able to register/login and fetch `/api/auth/me` (JWT required for `/me`)
- AGI: Able to create conversation, send message, and retrieve message history
  - If API-key middleware remains enabled for `/api/agi/*`, requests include a valid API key
  - Otherwise, tests run with API-key middleware disabled/scoped away from AGI routes
- Tools: Able to list tools and observe robust error handling on execution; executions recorded (API key required)
- Optional integrations: Linear endpoints respond when configured; other mounted routes respond as expected

## 16) Quick Reference (Commands)

- Install: `bun install`
- DB: `bun generate && bun migrate && bun seed`
- Run: `bun run dev`
- Tests: `bun test`
- Health: `curl -s "$APP_URL/health"`
- Docs: `curl -s "$APP_URL/docs/openapi.json" | jq .openapi`

---

Implementation notes: This plan is intentionally executable with cURL and Bun-only tools. For Postman/Insomnia, mirror the same steps, reusing the created API key (`$SK`) and JWT (`$JWT`).
