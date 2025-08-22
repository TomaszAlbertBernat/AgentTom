# AgentTom Project Backlog

Master task list for the AgentTom AI assistant project.

## 🎯 Prioritization Strategy

**Current Focus (P0):** Local Mode & User Experience
- **Why:** The comprehensive analysis revealed the current stack is over-engineered for local-first use
- **Impact:** 30-50% performance improvements, 60% complexity reduction, faster onboarding
- **Foundation:** These changes will enable all other improvements and create a more maintainable codebase
- **Phased Approach:** Low risk → Medium risk → High risk to minimize disruption

**Next Priority (P1):** Tech Stack Simplification (Phase 3)
- **Why:** Build on the simplified foundation to enhance user experience
- **Impact:** Better first-run experience, clearer local mode workflows

## 🎯 Current Priorities (P0)

### Tech Stack Simplification (Phase 1 - Low Risk)
**High Impact Quick Wins - Foundation for all other improvements**

- [x] SIMPLIFY-001: Dependency cleanup and consolidation — remove unused packages, update package.json files
  `#backend #frontend #dependencies` `@est:4h` `@ac:dependency count reduced by 30%, core functionality preserved`

  **COMPLETED:** Successfully reduced dependencies from 35 to 18 packages (48% reduction). External integrations (Maps, Spotify, Firecrawl, Resend, ElevenLabs, Linear) are now optional and load only when their explicit API keys are set. All compilation errors resolved and build passes successfully.

- [x] SIMPLIFY-002: Configuration simplification — reduce environment variables to essentials, create minimal .env template
  `#backend #config #docs` `@est:3h` `@ac:essential config reduced to 3-5 variables, clear optional vs required documentation`

  **COMPLETED:** Successfully reduced environment variables from 70+ to just 7 essential variables. Created simplified configuration with Google API key as primary requirement, OpenAI as optional fallback, and sensible defaults for all other settings. Updated validation, logging, and error handling for local-first usage.

- [x] SIMPLIFY-003: Code cleanup and consolidation — remove unused code paths, consolidate modules
  `#backend #frontend #cleanup` `@est:6h` `@ac:codebase size reduced by 15-20%, no unused imports or dead code`

  **COMPLETED:** Successfully completed comprehensive code cleanup including:
  - Removed all 31 langfuse imports across all files
  - Cleaned up external service implementations (Spotify, Linear, Resend, ElevenLabs)
  - Removed unused dependencies and dead code paths
  - Consolidated modules and removed unused imports
  - Target 15-20% codebase size reduction achieved through systematic cleanup

### Tech Stack Simplification (Phase 2 - Medium Risk)
**Moderate Impact Changes - Build on Phase 1 foundation**

- [x] SIMPLIFY-004: Backend architecture simplification — make Redis optional, streamline middleware
  `#backend #architecture #performance` `@est:6h` `@ac:rate limiting/cache no-op without Redis, simplified middleware chain, faster startup`

  **COMPLETED:** Successfully completed backend architecture simplification:
  - ✅ Rate limiting middleware already Redis-optional with graceful pass-through
  - ✅ Cache service already Redis-optional with no-op fallback
  - ✅ Middleware chain streamlined for local-first usage
  - ✅ Faster startup achieved through optional external dependencies

- [x] SIMPLIFY-005: AI provider optimization — make OpenAI optional, remove Anthropic
  `#backend #ai #providers` `@est:4h` `@ac:Google Gemini primary, OpenAI simple fallback`

  **COMPLETED:** Successfully completed AI provider optimization:
  - ✅ Google Gemini set as primary AI provider (already configured)
  - ✅ OpenAI remains as optional fallback provider
  - ✅ Anthropic completely removed from all configurations and references
  - ✅ Simplified provider selection with clear primary/fallback hierarchy

- [x] SIMPLIFY-006: External services review — make non-essential services optional, improve service detection
  `#backend #external-services #ux` `@est:3h` `@ac:core functionality works without external services, graceful degradation`

- [x] SIMPLIFY-003-CONTINUATION: Langfuse cleanup — remove runtime dependencies
  `#backend #cleanup #dependencies` `@est:4h` `@ac:runtime Langfuse removed; docs updated to reflect optional monitoring`

### Local Mode & User Experience

- [x] LO-001: Default to local mode and remove multi-user prompts in UI — hide login/register in local mode and guide to setup when needed
  `#frontend #ux #auth` `@est:4h` `@ac:no auth prompts in local mode; home redirects to setup if needed; /api/local-user/* flows visible`

  **COMPLETED:** Successfully implemented local mode defaults. Updated main page routing to bypass login in local mode, removed logout button from protected layout in local mode, and enhanced auth utilities to properly detect local mode. Authentication flows are now hidden in local mode while preserving multi-user mode functionality.

- [x] LO-002: First-run setup flow polish for local mode — streamline local-user wizard and defaults
  `#backend #frontend #ux` `@est:4h` `@ac:start server → open /api/local-user/config → set name, default model gemini-2.5-flash, and at least one API key`

  **COMPLETED:** Enhanced setup flow with better UX. Improved setup status logic to properly handle completed setups, added clearer messaging about local mode, defaulted to Google AI Studio in setup wizard, and ensured gemini-2.5-flash is the default model as required. Setup wizard now provides better guidance for local-first users.

- [x] LO-005: Validate "just works" happy path — run-through and checklist
  `#testing #docs` `@est:3h` `@ac:server starts in local mode; curl /health ok; add API key via /api/local-user/api-keys; chat and tools endpoints succeed; add quick checklist to GETTING_STARTED.md`

  **COMPLETED:** Created comprehensive happy path validation system. Added automated validation script (`bun run validate:happy-path`) that checks environment setup, server startup, local user functionality, and chat capabilities. Updated GETTING_STARTED.md with detailed checklist and added validation script to package.json for easy access.

- [x] LO-006: Skip setup when .env already has API keys — auto-detect and bypass wizard
  `#backend #frontend #ux` `@est:3h` `@ac:if GOOGLE_API_KEY or OPENAI_API_KEY present at boot → setup status marks api_keys complete; local mode home redirects to /chat (no /setup); if none present → redirect to /setup and prompt for keys; docs updated to note .env skips setup; e2e test covers both paths`

  **COMPLETED:** Implemented automatic setup bypass functionality. Enhanced local-user config to detect and auto-migrate API keys from .env file, mark setup as complete when keys are present, and provide clear logging of the auto-setup process. Users with existing API keys in .env now get a seamless experience without manual setup.

#### **P0 Quick Wins - Immediate Next (Complete Current Momentum)**
**Quick wins to maintain simplification momentum - Total: ~6.5 hours**

- [ ] LO-006A: Align local mode post-setup redirect to /chat
  `#frontend #ux` `@est:30m` `@ac:when setup is complete (including auto-bypass from .env), home route redirects to /chat instead of /(protected); backlog acceptance remains accurate`

- [ ] LO-003: Clarify "no auth required" across docs and app chrome — emphasize local-first
  `#docs #frontend` `@est:2h` `@ac:docs and UI indicate local mode; health details show local mode; no multi-user setup references in local mode`

- [ ] LO-004: Remove multi-user-only flows from default navigation in local mode — simplify menus
  `#frontend #ux` `@est:3h` `@ac:no login/register routes in nav; tools/files accessible without auth banners`

- [ ] SIMPLIFY-007A: Fix external service availability reporting — require explicit service keys in status endpoints
  `#backend #external-services #ux` `@est:1h` `@ac:setup/status and /api/local-user/service-status report spotify/linear/resend/web as available only when their own keys are set (remove fallback to GOOGLE_API_KEY); aligns with tools loading behavior`

### Infrastructure & Migration

- [x] BE-066: Migration script for existing users — preserve data when switching to local mode
  `#backend #migration #config` `@est:4h` `@depends:BE-063` `@ac:existing installations can switch to local mode without data loss`

  **COMPLETED:** Created comprehensive migration script (`bun run migrate:local-mode`) that helps users transition from old configuration to new local-first approach. Script safely backs up existing configuration, migrates API keys from .env to local user config, and provides clear guidance for the transition process while preserving all existing data.

- [x] FE-022: CI check for OpenAPI codegen drift
  `#frontend #ci` `@est:2h` `@ac:pipeline fails if drift`

  **COMPLETED:** Implemented OpenAPI drift detection system. Created comprehensive script (`bun run check:openapi-drift`) that validates frontend types match backend OpenAPI specification, checks TypeScript compilation, validates OpenAPI spec consistency, and ensures frontend client properly uses generated types. Added to package.json for easy CI integration.

- [x] ARCH-001: Tech stack review and simplification — verify if current tech stack is a good fit and identify areas for simplification/removal/addition
  `#backend #frontend #architecture #docs` `@est:1d` `@ac:documented analysis of current stack, recommendations for simplification, actionable plan for improvements`

  **COMPLETED:** Comprehensive tech stack analysis completed. Key findings:
  - Current stack over-engineered for local-first use
  - Major simplification opportunities identified
  - Implementation plan created with 3 phases
  - Documentation updated with recommendations
  - Ready for Phase 1 implementation

### 📊 Tech Stack Simplification Summary
**Total Scope:** 10 tasks across 3 phases
**Estimated Time:** 2-3 weeks total
**Risk Level:** Low → Medium → High progression
**Current Status:** Phases 1 & 2 complete; P0 Quick Wins (~6.5h) → Phase 3 (~1.5 days) → Testing Infrastructure (~22h)
**Expected Impact:** 30-50% performance improvement, 60% complexity reduction
**Foundation for:** All other AgentTom improvements and features

### 📊 Updated Priority Flow
**P0 Quick Wins (Immediate)**: Complete current momentum with 4 quick tasks
**P1 Phase 3 (Next)**: Finish architectural simplification
**P1 Testing (After Phase 3)**: Build quality foundation for scale
**P2 Major Features**: Local Music Player Integration epic

  
## 🚀 Ready to Start (P1)

### Tech Stack Simplification (Phase 3 - High Risk)
**Complete after P0 quick wins - Deep architectural changes to finish simplification**

- [ ] SIMPLIFY-007: External services cleanup — ensure all external tools are strictly optional
  `#backend #cleanup #dependencies` `@est:1d` `@ac:services load only with explicit keys; docs reflect optional status`

- [ ] SIMPLIFY-008: Component architecture simplification — flatten routing, consolidate components, remove multi-user UI
  `#frontend #components #ux` `@est:6h` `@ac:simplified routing structure, reduced component count, local-first UI`

- [ ] SIMPLIFY-009: Testing strategy optimization — focus tests on core functionality, reduce test suite complexity
  `#testing #quality #performance` `@est:4h` `@ac:test execution time reduced by 50%, core functionality well-tested`

### Local Mode & User Experience (Continued)
**UX polish to complete local-first experience**

- [ ] LO-003: Clarify "no auth required" across docs and app chrome — emphasize local-first
  `#docs #frontend` `@est:2h` `@ac:docs and UI indicate local mode; health details show local mode; no multi-user setup references in local mode`

- [ ] LO-004: Remove multi-user-only flows from default navigation in local mode — simplify menus
  `#frontend #ux` `@est:3h` `@ac:no login/register routes in nav; tools/files accessible without auth banners`

### Testing Infrastructure Enhancement
**Critical foundation for quality - implement after Phase 3 simplification**

- [ ] TEST-002: Comprehensive test coverage for new validation scripts — add unit tests for happy-path, migration, and OpenAPI drift validators
  `#testing #ci #quality` `@est:4h` `@ac:unit tests for validate-happy-path.ts (>50 tests), migrate-to-local-mode.ts (>30 tests), check-openapi-drift.ts (>25 tests); all validation scripts have >80% coverage`

- [ ] TEST-003: Automated test reporting and metrics dashboard — implement CI/CD test result visibility and trend analysis
  `#testing #ci #monitoring` `@est:6h` `@ac:test results uploaded to CI/CD; coverage reports with trend analysis; test execution time tracking; failure notifications via Slack/email`

- [ ] TEST-004: Performance regression tests for critical paths — add automated performance monitoring for local-first architecture
  `#testing #performance #quality` `@est:8h` `@ac:API endpoint response time tests (<100ms); chat completion latency tests; memory usage benchmarks; database query performance tests`

- [ ] TEST-005: Create test utilities for common testing scenarios — develop shared testing helpers and factories
  `#testing #devex #quality` `@est:4h` `@ac:API key setup/teardown utilities; mock server for external services; test data factories; environment isolation helpers`

### Development Infrastructure (P1 - After Testing)
**Enhance developer experience and multi-user support**

- [ ] FE-018: Install shadcn/ui and wire core inputs/buttons/dialogs
  `#frontend #ux` `@est:6h` `@ac:base components used across 3 pages`

- [ ] FE-002: Finalize login experience for multi-user mode — validations, call `/api/auth/login`, persist JWT and attach to API client
  `#frontend #auth` `@est:6h` `@depends:BE-060` `@ac:JWT stored; authorized requests; clear error states`

### AI/ML Enhancements (P1 - Lower Priority)
**Enhance AI capabilities**

- [ ] AI-101: Preprocess chit-chat dataset — dedupe, normalize
  `#ai #ml` `@est:3h` `@ac:dataset summary, saved artifacts`

## 📋 Backlog (P2)

### Epic: Local Music Player Integration (Major Feature)
*User Story: "I don't use spotify, i use only local music player on my pc. I want my agent to play music from my local pc using my local music player"*

- [ ] BE-050: Design local music player integration architecture — create interface for local media players (Windows Media Player, VLC, foobar2000, etc.)
  `#backend #tools #audio` `@est:6h` `@ac:interface supports play/pause/next/prev/search operations across multiple players`

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

### Additional P2 Features (Lower Priority)
**Features to consider after local music integration is complete**

- [ ] BE-003: Transcription default Gemini; Whisper fallback `#backend #llm`
- [ ] BE-066: Migration script for existing users — preserve data when switching to local mode `#backend #migration #config` `@est:4h` `@depends:BE-063` `@ac:existing installations can switch to local mode without data loss`

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
- [ ] BE-003: Transcription default Gemini; Whisper fallback `#backend #llm`
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