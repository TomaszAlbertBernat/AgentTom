# AgentTom Project Backlog

Master task list for the AgentTom AI assistant project.

## 🎯 Current Priorities (P0)

- [ ] BE-066: Migration script for existing users — preserve data when switching to local mode  
  `#backend #migration #config` `@est:4h` `@depends:BE-063` `@ac:existing installations can switch to local mode without data loss`

- [ ] FE-022: CI check for OpenAPI codegen drift  
  `#frontend #ci` `@est:2h` `@ac:pipeline fails if drift`

- [ ] ARCH-001: Tech stack review and simplification — verify if current tech stack is a good fit and identify areas for simplification/removal/addition  
  `#backend #frontend #architecture #docs` `@est:1d` `@ac:documented analysis of current stack, recommendations for simplification, actionable plan for improvements`

- [ ] FE-019: Unify page shells and loading/empty states  
  `#frontend #ux` `@est:6h` `@ac:skeleton/empty patterns consistent`
## 🚀 Ready to Start (P1)

- [ ] BE-050: Design local music player integration architecture — create interface for local media players (Windows Media Player, VLC, foobar2000, etc.)  
  `#backend #tools #audio` `@est:6h` `@ac:interface supports play/pause/next/prev/search operations across multiple players`

- [ ] FE-018: Install shadcn/ui and wire core inputs/buttons/dialogs  
  `#frontend #ux` `@est:6h` `@ac:base components used across 3 pages`

- [ ] FE-002: Finalize login experience for multi-user mode — validations, call `/api/auth/login`, persist JWT and attach to API client  
  `#frontend #auth` `@est:6h` `@depends:BE-060` `@ac:JWT stored; authorized requests; clear error states`

- [ ] AI-101: Preprocess chit-chat dataset — dedupe, normalize  
  `#ai #ml` `@est:3h` `@ac:dataset summary, saved artifacts`

## 📋 Backlog (P2)

### Epic: Local Music Player Integration
*User Story: "I don't use spotify, i use only local music player on my pc. I want my agent to play music from my local pc using my local music player"*

- [ ] BE-051: Implement Windows Media Player integration — COM automation for basic playback control  
  `#backend #tools #audio` `@est:1d` `@depends:BE-050` `@ac:can play/pause/skip tracks via Windows Media Player COM interface`

- [ ] BE-052: Add VLC media player integration — HTTP interface for playback control  
  `#backend #tools #audio` `@est:1d` `@depends:BE-050` `@ac:can control VLC via HTTP API when enabled`

- [ ] BE-053: Create local music library scanner — index music files from specified directories  
  `#backend #tools #audio` `@est:1d` `@depends:BE-050` `@ac:scans folders, extracts metadata, creates searchable index`

- [ ] BE-054: Replace Spotify service with local music service — swap implementation while keeping same tool interface  
  `#backend #tools #audio` `@est:6h` `@depends:BE-051,BE-052,BE-053` `@ac:music tool uses local players instead of Spotify`

- [ ] BE-055: Add music library search and filtering — find tracks by artist, album, title, genre  
  `#backend #tools #audio` `@est:4h` `@depends:BE-053` `@ac:search returns relevant local tracks with metadata`

- [ ] FE-040: Update music tool UI for local playback — remove Spotify auth, add library management  
  `#frontend #tools #audio` `@est:6h` `@depends:BE-054` `@ac:UI shows local library, no auth required, music directory config`

- [ ] DOC-010: Document local music setup — installation and configuration guide  
  `#docs #tools` `@est:2h` `@depends:BE-054` `@ac:clear setup instructions for each supported player`

### Epic: Personal Local-Only Simplification
*User Story: "As a single user running on localhost, I want AgentTom to just work without any authentication, so I can use it immediately with my own API keys."*

- [ ] LO-001: Default to local mode and remove multi-user prompts in UI — hide login/register in local mode and guide to setup when needed  
  `#frontend #ux #auth` `@est:4h` `@ac:no auth prompts in local mode; home redirects to setup if needed; /api/local-user/* flows visible`

- [ ] LO-002: First-run setup flow polish for local mode — streamline local-user wizard and defaults  
  `#backend #frontend #ux` `@est:4h` `@ac:start server → open /api/local-user/config → set name, default model gemini-2.5-flash, and at least one API key`

- [ ] LO-003: Clarify "no auth required" across docs and app chrome — emphasize local-first  
  `#docs #frontend` `@est:2h` `@ac:docs and UI indicate local mode; health details show local mode; no multi-user setup references in local mode`

- [ ] LO-004: Remove multi-user-only flows from default navigation in local mode — simplify menus  
  `#frontend #ux` `@est:3h` `@ac:no login/register routes in nav; tools/files accessible without auth banners`

- [ ] LO-005: Validate "just works" happy path — run-through and checklist  
  `#testing #docs` `@est:3h` `@ac:server starts in local mode; curl /health ok; add API key via /api/local-user/api-keys; chat and tools endpoints succeed; add quick checklist to GETTING_STARTED.md`

## ✅ Completed

- [x] BE-060: Design authentication-optional architecture — create user session without mandatory login  
  `#backend #auth` `@est:4h` `@ac:system works with anonymous local users; clear toggle for multi-user`

- [x] BE-063: Remove database auth requirements — make user table optional, default to local mode  
  `#backend #auth #database` `@est:4h` `@depends:BE-060` `@ac:app runs without registration/login in local mode`

- [x] BE-065: Update middleware for optional auth — detect local vs authenticated modes  
  `#backend #auth #middleware` `@est:4h` `@depends:BE-063` `@ac:transparent handling for both modes`

- [x] BE-061: Implement local user configuration — file-based user config for API keys and preferences  
  `#backend #auth #config` `@est:6h` `@depends:BE-060` `@ac:reads local config; creates default on first run`

- [x] FE-013: OpenAPI codegen types and adopt client in pages  
  `#frontend #typing` `@est:4h` `@ac:src/lib/api/types.d.ts generated; pages use typed client`

- [x] FE-014: Introduce React Query for tools, executions, health, conversations  
  `#frontend #data` `@est:6h` `@ac:queries/mutations cover 4 areas with cache`

- [x] FE-015: Centralize error normalization + toasts  
  `#frontend #ux` `@est:4h` `@ac:consistent toasts for 4 main flows`

- [x] FE-020: Playwright flows: auth, chat, tool execute, file upload, search  
  `#frontend #testing` `@est:1d` `@ac:5 green e2e specs in CI`

- [x] FE-023: Streaming chat endpoint + UI  
  `#frontend #chat` `@est:1d` `@ac:SSE renders token stream`

- [x] FE-024: Schema-driven tool forms using backend schemas (Zod)  
  `#frontend #tools` `@est:1d` `@ac:3 tools auto-form`

- [x] DOC-013: Update getting started guide — reflect new local-first approach  
  `#docs #config` `@est:2h` `@depends:BE-061` `@ac:clear instructions for both local and multi-user deployments`

- [x] TEST-001: Verify and implement comprehensive testing strategy — audit existing tests and implement missing test types  
  `#backend #frontend #testing #quality` `@est:2d` `@ac:✅ smoke tests verified/implemented; ✅ unit tests coverage >80% for critical services; ✅ integration tests for API endpoints; ✅ system tests for key workflows; ✅ regression test suite established`

- [x] BE-001: Implement `/api/auth/login` — validate credentials, issue JWT, rate-limited  
  `#backend #auth` `@ac:200 + token; invalid creds 401; rate-limited 429`

- [x] BE-004: Finalize `docs/GETTING_STARTED.md` (auth notes, port, envs)  
  `#backend #docs #auth`

- [x] BE-002: Keep DALL·E image generation; Imagen 3 deferred `#backend #llm`
- [x] BE-003: Transcription default Gemini; Whisper fallback `#backend #llm`
- [x] FE-003: Load messages for conversation `#frontend #chat`
- [x] FE-004: Conversation list UI `#frontend #chat`
- [x] FE-005: Error/empty states `#frontend #chat`
- [x] FE-006: Tool detail/execute UI `#frontend #tools`
- [x] FE-007: Unavailable tools UX `#frontend #tools`
- [x] FE-008: File viewer by uuid `#frontend #files`
- [x] FE-009: Base64 upload optional `#frontend #files`
- [x] FE-010: Web get-contents flow `#frontend #search`
- [x] FE-011: Logout button `#frontend #auth`
- [x] FE-012: Me status hydration `#frontend #auth`
- [x] FE-027..FE-039: MVP features baseline `#frontend`

## 📝 Task Format

Tasks follow this format:
```
- [ ] ID: Brief description — detailed explanation
  `#tags` `@est:time` `@depends:other-id` `@ac:acceptance criteria`
```

**Tags**: `backend`, `frontend`, `ai`, `docs`, `tools`, `auth`, `chat`, `ux`, `ci`, `data`, `testing`  
**Estimates**: `1h`, `4h`, `6h`, `1d`  
**Priorities**: P0 (urgent), P1 (next), P2 (later)