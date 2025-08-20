# MASTER BACKLOG

## Epics

- [ ] EP-001: Secure authentication and session management  #tags: product,backend,frontend,auth  @priority:P0
  - Goal: Robust JWT auth, API keys, and frontend UX.
- [ ] EP-002: Conversational AGI core  #tags: product,backend,ai,chat  @priority:P0
  - Goal: Reliable chat with streaming, memory, tool calls.
- [ ] EP-003: Tools platform  #tags: product,backend,frontend,tools  @priority:P1
  - Goal: Discoverable tools with schemas and telemetry.
- [ ] EP-004: Docs, DX and CI  #tags: product,docs,devex,ci  @priority:P1
  - Goal: Clear setup, type safety, tests and release hygiene.
- [ ] EP-005: Frontend UX polish  #tags: product,frontend,ux  @priority:P2
  - Goal: Consistent components, error states, theming.

## Ready stories (top of backlog)

- [ ] BE-001: Implement `/api/login` — validate credentials, issue JWT.  #tags: backend,auth  @priority:P0  @est:4h  @ac: returns 200 + token; invalid creds 401; rate-limited returns 429
- [ ] BE-004: Finalize `docs/GETTING_STARTED.md` (auth notes, port, envs).  #tags: backend,docs,auth  @priority:P0  @est:1h  @ac: doc matches current envs and routes
- [ ] FE-002: Login page — validations, call `/api/login`, handle errors.  #tags: frontend,auth  @priority:P0  @est:6h  @depends:BE-001  @ac: success routes to dashboard; invalid shows inline errors
- [ ] FE-013: OpenAPI codegen types and adopt client in pages.  #tags: frontend,typing  @priority:P1  @est:4h  @ac: `src/lib/api/types.d.ts` generated; pages use typed client
- [ ] FE-014: Introduce React Query for tools, executions, health, conversations.  #tags: frontend,data  @priority:P1  @est:6h  @ac: queries/mutations cover 4 areas with cache
- [ ] FE-015: Centralize error normalization + toasts.  #tags: frontend,ux  @priority:P1  @est:4h  @ac: consistent toasts for 4 main flows
- [ ] FE-018: Install shadcn/ui and wire core inputs/buttons/dialogs.  #tags: frontend,ux  @priority:P2  @est:6h  @ac: base components used across 3 pages
- [ ] FE-019: Unify page shells and loading/empty states.  #tags: frontend,ux  @priority:P2  @est:6h  @ac: skeleton/empty patterns consistent
- [ ] FE-020: Playwright flows: auth, chat, tool execute, file upload, search.  #tags: frontend,testing  @priority:P1  @est:1d  @ac: 5 green e2e specs in CI
- [ ] FE-022: CI check for OpenAPI codegen drift.  #tags: frontend,ci  @priority:P2  @est:2h  @ac: pipeline fails if drift
- [ ] FE-023: Streaming chat endpoint + UI.  #tags: frontend,chat  @priority:P1  @est:1d  @ac: SSE renders token stream
- [ ] FE-024: Schema-driven tool forms using backend schemas (Zod).  #tags: frontend,tools  @priority:P1  @est:1d  @ac: 3 tools auto-form
- [ ] AI-101: Preprocess chit-chat dataset — dedupe, normalize.  #tags: ai,ml  @priority:P2  @est:3h  @ac: dataset summary, saved artifacts

## Done

- [x] BE-002: Keep DALL·E image generation; Imagen 3 deferred.  #tags: backend,llm  @priority:P2
- [x] BE-003: Transcription default Gemini; Whisper fallback.  #tags: backend,llm  @priority:P1
- [x] FE-003: Load messages for conversation.  #tags: frontend,chat
- [x] FE-004: Conversation list UI.  #tags: frontend,chat
- [x] FE-005: Error/empty states.  #tags: frontend,chat
- [x] FE-006: Tool detail/execute UI.  #tags: frontend,tools
- [x] FE-007: Unavailable tools UX.  #tags: frontend,tools
- [x] FE-008: File viewer by uuid.  #tags: frontend,files
- [x] FE-009: Base64 upload optional.  #tags: frontend,files
- [x] FE-010: Web get-contents flow.  #tags: frontend,search
- [x] FE-011: Logout button.  #tags: frontend,auth
- [x] FE-012: Me status hydration.  #tags: frontend,auth
- [x] FE-027..FE-039: MVP features baseline.  #tags: frontend