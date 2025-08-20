# Product Backlog (Epics → Stories)

## EP-001 Secure authentication and session management
- BE-001: Implement `/api/login` — validate credentials, issue JWT.  #tags: backend,auth  @priority:P0  @est:4h  @ac: 200 + token; 401 invalid; 429 on RL
- FE-002: Login page — validations, call `/api/login`.  #tags: frontend,auth  @priority:P0  @est:6h  @depends:BE-001

## EP-002 Conversational AGI core
- FE-023: Streaming chat endpoint + UI.  #tags: frontend,chat  @priority:P1  @est:1d
- AI-101: Preprocess chit-chat dataset.  #tags: ai,ml  @priority:P2  @est:3h

## EP-003 Tools platform
- FE-024: Schema-driven tool forms (Zod).  #tags: frontend,tools  @priority:P1  @est:1d

## EP-004 Docs, DX and CI
- BE-004: Finalize getting started docs.  #tags: backend,docs  @priority:P0  @est:1h
- FE-022: CI codegen drift check.  #tags: frontend,ci  @priority:P2  @est:2h

## EP-005 Frontend UX polish
- FE-013: OpenAPI types + adopt client.  #tags: frontend,typing  @priority:P1  @est:4h
- FE-014: React Query adoption.  #tags: frontend,data  @priority:P1  @est:6h
- FE-015: Error normalization + toasts.  #tags: frontend,ux  @priority:P1  @est:4h
- FE-018: shadcn/ui base components.  #tags: frontend,ux  @priority:P2  @est:6h
- FE-019: Unified shells/loading/empty.  #tags: frontend,ux  @priority:P2  @est:6h
- FE-020: Playwright flows.  #tags: frontend,testing  @priority:P1  @est:1d



