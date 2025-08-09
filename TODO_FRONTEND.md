## Frontend TODO for AgentTom

Purpose: Plan a modern, typed, secure frontend that interacts with the existing Bun/Hono backend. Do not implement yet; this document defines the architecture, tech choices, and execution plan.

Status: This plan reflects current backend realities. Several backend gaps must be addressed before a production-ready frontend can ship.

### Goals (MVP)
- Auth: register/login and JWT session, guard protected routes, show current user (`/api/auth/*`).
- Conversations: create/send messages, list history (`/api/agi/*`).
- Tools: list and execute tools with typed payloads and result display (`/api/tools`, `/api/tools/execute`).
- Files: upload and retrieve files (`/api/files/upload`, `/api/files/:uuid`).
- Web: search and get contents (`/api/web/search`, `/api/web/get-contents`).
- Docs: link to Swagger UI (`/docs`) and consume `/docs/openapi.json` for types.

Constraints validated against backend:
- Auth endpoints exist (`/api/auth/register`, `/api/auth/login`, `/api/auth/me`).
- AGI supports creating conversations, sending messages, and fetching messages for a conversation, but lacks a list endpoint.
- Tools and Files endpoints match current backend.
- Web search/content and health endpoints exist.
- OpenAPI spec is served at `/docs/openapi.json` and now includes minimal `paths` to unblock codegen (expand later with real schemas).

### Recommended Tech Stack (aligned with Tech_stack.md)
- Runtime/Package manager: Bun (same as backend)
- Framework: Next.js (App Router)
- Language: TypeScript (strict)
- UI: Tailwind CSS + shadcn/ui (Radix primitives)
- Data fetching/cache: TanStack Query (React Query)
- Forms/validation: react-hook-form + Zod (to mirror backend validation)
- API typing: openapi-typescript + openapi-fetch (or orval) generated from `/docs/openapi.json`
- State: Light global store with Zustand (auth/session/UI prefs)
- Icons: Lucide
- Testing: Playwright (E2E) + Vitest/RTL (component)
- Lint/format: ESLint + Prettier (match backend conventions)

Additions
- CI: add schema/spec drift check for OpenAPI (fails if local generation changes).
Rationale
- Type safety end-to-end via OpenAPI codegen and Zod schemas mirrors backend’s Zod usage.
- Next.js enables SSR/ISR for protected pages and clean routing; can add middleware for auth gatekeeping.
- Bun keeps dev tooling consistent across repo.

### High-level Architecture
- Monorepo: add `frontend/` directory at repo root.
- API Client Layer: generated types + thin wrappers per resource (auth, agi, tools, files, web).
- Auth: JWT-based in dev; plan for production API key + JWT strategy (see “Auth considerations”).
- Proxy Layer: Next.js Route Handlers under `app/api/*` to:
  - attach Authorization headers server-side from HttpOnly cookie
  - optionally inject API key in production without exposing it in the browser
  - handle CORS locally (frontend→frontend API) while backend allows only server-to-server
- UI Layout: App Router with protected segments; shared shell (sidebar, header, toasts).

Backend gaps that affect architecture
- OpenAPI spec has no `paths` section; must be generated (via `@hono/zod-openapi` or manual) for end-to-end typing.
- Production auth previously could not carry API key and JWT simultaneously. This is now addressed by accepting `X-API-Key` and supporting JWT via `Authorization` or `X-JWT`.

### API Mapping (backend → frontend features)
- Auth
  - POST `/api/auth/register`
  - POST `/api/auth/login` → returns JWT
  - GET `/api/auth/me`
- AGI
  - POST `/api/agi/conversations`
  - POST `/api/agi/messages`
  - GET `/api/agi/conversations/:id/messages`
- Missing: `GET /api/agi/conversations` (list). For now, `src/routes/conversation.ts` is mounted under `/api/conversations` providing list/read/create.
- Tools
  - GET `/api/tools`
  - POST `/api/tools/execute`
  - GET `/api/tools/executions` (available; useful for dashboard recent activity)
- Files
  - POST `/api/files/upload`
  - POST `/api/files/upload/base64`
  - GET `/api/files/:uuid`
- Web
  - POST `/api/web/search`
  - POST `/api/web/get-contents`
  - GET `/api/web/health`, GET `/api/web/health/details`
- Docs
  - GET `/docs`, `/docs/openapi.json` (for codegen). Current spec lacks `paths` and is insufficient for client generation.

### Pages & Flows (MVP)
- `/login` and `/register`: auth forms; save JWT in HttpOnly secure cookie via proxy route; redirect to dashboard.
- `/` (dashboard): quick links, service status (from `/api/web/health/details`), recent tool executions (`/api/tools/executions`).
- `/chat`
  - Start conversation, send messages, list history; optimistic updates; streaming later (future).
  - Conversation list requires a new backend endpoint (`GET /api/agi/conversations`) or mounting of existing conversations route. Do not rely on client-side cache for durability.
- `/tools`
  - List tools from `/api/tools`, show availability; detail page renders form per tool/action.
  - Handle tools that exist in DB but have no implementation in `toolsMap` (show as unavailable).
- `/files`
  - Upload (multipart and base64) and list recently uploaded (client-side cache); link to GET by uuid.
- `/search`
  - Execute web search and show results; link out to content, display `get-contents` results.

### Auth Considerations
- Dev (current): `DISABLE_API_KEY=true` (default in non-production) → backend accepts `Authorization: Bearer <jwt>` or `X-JWT` and sets `request.user`.
- Prod (updated): backend accepts `X-API-Key: <api_key>` and AGI consumes `request.user` from the global middleware; JWT may be provided via `Authorization: Bearer <jwt>` or `X-JWT` by the proxy.
- Precedence: in production API-key mode, API key authorizes access; user context comes from JWT when provided.
- Proxy details:
  - Store JWT in HttpOnly, Secure, SameSite=Strict cookies scoped to the frontend domain.
  - Next Route Handlers read cookies and attach `Authorization: Bearer <jwt>` and `X-API-Key` as required.
  - Browser→Next: cookie-auth only. Next→backend: headers attached server-side.

### API Typing and Client
- Generate types from OpenAPI: `/docs/openapi.json`.
- Tooling options:
  - `openapi-typescript` → type declarations + `openapi-fetch` client
  - or `orval` → generates typed hooks for React Query
- Paths are present (minimal). Next task: generate routes with `@hono/zod-openapi` to strengthen schemas and responses.
- Codegen script example (once `paths` exist):
  - `bunx openapi-typescript http://localhost:3000/docs/openapi.json -o frontend/src/lib/api/types.d.ts`
  - Optional: generate a small typed client using `openapi-fetch` with `paths` from the generated types.
  - CI should fail if the generated types are out-of-date.

### State & Data Layer
- TanStack Query for server data; normalized caches per resource.
- Avoid duplicating server state into Zustand; use Zustand only for UI concerns and a minimal `authStatus` flag sourced from `/api/auth/me` via proxy.
- Error handling: central error normalizer that adapts backend shapes to a unified client shape:
  - Input shapes observed: `{ success?: boolean, error?: string, message?: string, type?: string, code?: string, details?: unknown }`
  - Normalize to `{ ok: boolean; code?: string; message: string; details?: unknown }` and surface through toasts/boundaries.

Backend recommendations (non-blocking but valuable):
- Standardize backend responses to `{ success: boolean; data?: T; error?: string; code?: string; details?: unknown }` to reduce client normalization logic.

### Styling & Components
- Tailwind CSS for utility-first styling; design tokens in `tailwind.config.ts`.
- shadcn/ui + Radix for accessible primitives (Button, Input, Dialog, Tabs, Dropdown).
- MD rendering for AI/chat responses using `marked` or a React MD renderer; code blocks with syntax highlighting.

### Directory Structure (Next.js App Router)
```
frontend/
  app/
    (public)/login/page.tsx
    (public)/register/page.tsx
    (protected)/layout.tsx
    (protected)/page.tsx            # dashboard
    (protected)/chat/page.tsx
    (protected)/tools/page.tsx
    (protected)/files/page.tsx
    (protected)/search/page.tsx
    api/
      auth/[action]/route.ts        # proxy to backend auth, set cookies
      agi/[...path]/route.ts        # proxy to backend agi
      tools/[...path]/route.ts      # proxy to backend tools
      files/[...path]/route.ts      # proxy to backend files
      web/[...path]/route.ts        # proxy to backend web
  src/
    lib/api/client.ts               # openapi-fetch setup
    lib/auth/session.ts             # cookie helpers
    lib/config.ts                   # API base URL
    components/ui/*
    features/chat/*
    features/tools/*
    features/auth/*
    features/files/*
    features/search/*
```

### Security
- Cookies: HttpOnly, Secure, SameSite=Strict (adjust to Lax only if needed for cross-site flows); short TTL + refresh on `/api/auth/me`.
- CSRF: Proxy routes are same-origin and cookie-auth’d; still include an anti-CSRF token (double-submit cookie or Origin check + custom header) on state-changing requests to Next route handlers.
- Do not expose API keys in browser; use server-side proxy to attach them. Requires backend support as noted above.
- Respect backend CORS in production: set `CORS_ORIGIN` to the frontend origin; `credentials: true` is enabled on backend.
- Surface and respect rate limit headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.
 - Reconcile CSP with SSE/streaming (see Future Enhancements) when a streaming endpoint exists.

### Dev Setup (once implemented)
- Prereqs: backend running at `http://localhost:3000`.
- Scaffold app:
  - `bunx create-next-app@latest frontend --ts --tailwind --eslint --use-bun`
  - `cd frontend && bun install`
- Env in `frontend/.env.local`:
  - `NEXT_PUBLIC_API_BASE_URL=http://localhost:3000`
  - `NEXT_PUBLIC_APP_URL=http://localhost:3001` (if running frontend on 3001)
- Start dev: `bun run dev` (from `frontend/`)
- Configure Next rewrites to `http://localhost:3000` for static GET endpoints; use proxy route handlers for authenticated POSTs.
 - Minimal OpenAPI `paths` unblocks codegen. Prefer moving to generated `paths` with `@hono/zod-openapi` soon.

### Deployment (outline)
- Option A: Vercel for frontend, backend hosted separately (Fly, Render, Docker on VPS). Lock down backend CORS to frontend domain.
- Option B: Self-host both behind an Nginx reverse proxy; share domain with path-based routing `/api` (backend) and `/` (frontend).
- Configure environment: API base URL, cookie domain, secure flags.
 - Backend supports `X-API-Key`. Ensure frontend proxy attaches `X-API-Key` and `Authorization: Bearer <jwt>`/`X-JWT` appropriately.
 - Harden CORS to an allowlist; avoid `*` with `credentials: true` in production.

### Testing
- Component tests: Vitest + Testing Library (jsdom), MSW for API mocking, Storybook optional for visual states.
- E2E: Playwright covering auth, chat send/receive, tools execution, file upload.
- Contract tests: CI step to regenerate OpenAPI types and ensure no breaking changes. Add a lock check to fail CI if diff exists.
 - Add a smoke test for rate-limit headers and CORS preflight behavior to ensure proxy routes don’t regress.

### Future Enhancements
- Streaming chat (SSE/WebSocket) once backend exposes a streaming endpoint. There is no `/api/agi/chat` or `/api/agi/chat/stream` route yet (cron service references `/api/agi/chat`, which is missing). Implement server endpoint using `streamResponse` when ready.
- Tool form auto-generation from backend schemas (`src/config/tool-schemas.ts`) exposed via a new read-only endpoint.
- OAuth flows (Google/Spotify/Linear) once keys are configured; integrate corresponding UI buttons.
- Internationalization with next-intl.
- Theming (dark/light) with CSS variables.
- Add `GET /api/agi/conversations` and optionally `DELETE /api/agi/conversations/:id` for full UX.

### Open Questions / Backend Coordination
- Confirm production auth strategy (API key + JWT layering). Required change: accept `X-API-Key` and keep `Authorization: Bearer <jwt>` for JWT (or support `X-JWT`) to avoid dual Authorization conflict.
- Expose tool/action schemas via endpoint to enable dynamic form rendering.
- Add CORS allowlist for the production frontend domain.
- Add `GET /api/agi/conversations` (list) and optionally `DELETE /api/agi/conversations/:id`.
- Standardize error response shape across routes (align to OpenAPI `Error` and include `code`, `type` where applicable) to simplify client.
 - Expand OpenAPI `paths` via `@hono/zod-openapi` to replace minimal placeholders.

### Task Checklist
- [ ] Initialize `frontend/` with Next.js, TS, Tailwind, shadcn/ui
- [ ] Add OpenAPI codegen script and typed client; enforce in CI (partially unblocked; schemas still minimal)
- [ ] Implement server-side proxy route handlers for auth-protected calls
- [ ] Auth pages and cookie-based session management + CSRF for proxy POSTs
- [ ] Dashboard with health summary from `/api/web/health/details` and `/api/tools/executions`
- [ ] Chat UI: create conversation, send message, list history (blocked on conversations list endpoint)
- [ ] Tools explorer: list and execute with validated forms; handle unavailable tools
- [ ] Files: upload + view fetched by uuid (validate size/mime client-side)
- [ ] Web search/content pages
- [ ] Route protection (middleware) and error boundaries
- [ ] E2E baseline with Playwright + MSW for component tests
- [ ] CI step for type generation and lint/tests
 - [x] Backend: add `X-API-Key` support
 - [x] Backend: remove AGI route-level JWT dependency (AGI now uses global `request.user`)
 - [x] Backend: mount conversations list endpoint (`/api/conversations`)
 - [x] Backend: add minimal OpenAPI `paths` for mounted routes
 - [ ] Backend: implement `/api/agi/chat` (and `/stream`) or remove cron references


