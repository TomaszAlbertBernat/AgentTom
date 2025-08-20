# Backlog and Agent Views

This folder contains the single source of truth backlog and generated per-agent task views.

- `MASTER_TODO.md` — canonical backlog with task IDs, tags, priority, estimates, acceptance criteria.
- `agent_configs.yml` — declares agent views (name, tag matcher, output path).
- `generated/` — per-agent TODOs generated from master (ignored by Git).

Workflows:

- Update `MASTER_TODO.md` directly. Tags determine which agent views receive a task.
- Generate views: `bun run todo:split` (pre-commit hook also runs this).
- Agents mark tasks as done in their `generated/todo_*.md` file.
- Merge agent updates: `bun run todo:merge` to sync completion back to master.

Conventions:

- Task line: `- [ ] FE-014: Short title  #tags: frontend,data  @priority:P1  @est:6h  @depends:BE-001  @ac: acceptance criteria`
- Tags drive routing to agent views. Use `backend`, `frontend`, `ai`, `docs`, `tools`, `auth`, `chat`, `ux`, `ci`, `data`.



