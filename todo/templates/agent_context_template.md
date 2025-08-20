# Agent context: {agent_name}

## Purpose
Short summary of the agent role (e.g. "backend agent — implements API endpoints, DB schema, migrations").

## Constraints
- Node 18 runtime
- Use Hono + Drizzle ORM
- Environment variables: see `.env-example`

## Code style
- ESLint + Prettier
- commit message pattern: `TASKID: <short description>`

## Typical workflow
1. Pick next task from `todo/generated/todo_{agent}.md`
2. Open a branch `task/<TASKID>-short` and push a PR
3. When PR is ready, mark task done with the `PR:` metadata


