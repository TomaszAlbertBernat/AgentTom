# Multi-Agent Task Orchestration — Master + Agent Views

This document contains a recommended repo layout, task schema, conventions, and scripts to **maintain a single master TODO (source of truth)** while **automatically generating per-agent TODO views** and offering tools to reconcile/merge agent updates back into the master. Designed for a manager/orchestrator who assigns tasks and multiple coding agents that consume per-agent work queues.

---

## Goals

- Keep a single master TODO that's easy for you to scan and manage.
- Provide focused, minimal-per-context TODOs for each agent to reduce cognitive load.
- Allow agents to work in parallel without stepping on each other.
- Make syncing and merging as automatic and conflict-free as possible.

---

## Repo layout (recommended)

```
project-root/
├─ todo/
│  ├─ MASTER_TODO.md        # single source of truth (human-readable)
│  ├─ generated/            # auto-generated per-agent TODOs (gitignored)
│  │  ├─ todo_backend.md
│  │  ├─ todo_frontend.md
│  │  └─ todo_ai.md
│  ├─ templates/
│  │  ├─ agent_context_template.md
│  │  │
│  └─ agent_configs.yml    # list of agents + config (auto-split rules)
├─ scripts/
│  ├─ splitMaster.ts        # generate per-agent TODOs (run with Bun)
│  ├─ mergeAgentUpdates.ts  # merge agent updates back to master (Bun)
├─ .githooks/
│  └─ pre-commit (optional) # runs split on commit or runs checks
└─ README-agent-system.md
```

Notes:

- `todo/generated` should be `.gitignore`'d if agents operate outside the repo or to avoid noise; alternatively, commit generated files if agents are Git-aware and push PRs against them.
- `agent_configs.yml` declares tags and where to split.

---

## Task format (convention)

Use a concise structured format inside `MASTER_TODO.md`. Each task should be one list item with metadata encoded in-line by tags.

Example:

```md
- [ ] BE-001: Implement login route — Create /api/login endpoint, validate JWT, return user profile.  #tags: backend,auth  @priority:high  @est:3h  @depends:FE-002
- [ ] FE-002: Login page — form + validation + call /api/login, show error states.  #tags: frontend,auth  @priority:high  @est:4h  @blocked-by:BE-001
- [ ] AI-005: Fine-tune intent model on new dataset — dataset v2, 3 epochs.  #tags: ai,ml  @priority:medium  @est:6h
```

**Supported metadata keys:**

- `#tags:` comma-separated tags used for splitting
- `@priority:` low|medium|high
- `@est:` estimated time, e.g. `3h`, `1d`
- `@depends:` comma-separated task IDs this task depends on
- `@blocked-by:` same as depends (human-friendly)
- `ID` prefix (like `BE-001`) should be unique per project and used for crosslinks

The scripts below parse tags and IDs to generate per-agent files and to help with merges.

---

## Agent context files

For each agent create a `context` file they can read, e.g. `todo/templates/agent_context_template.md`:

```md
# Agent context: {agent_name}

## Purpose
Short summary of the agent role (e.g. "backend agent — implements API endpoints, DB schema, migrations").

## Constraints
- Node 18 runtime
- Use Express + TypeORM
- Environment variables: ...

## Code style
- ESLint + Prettier
- commit message pattern: `TASKID: <short description>`

## Typical workflow
1. Pick next task from `todo/generated/todo_{agent}.md`
2. Open a branch `task/<TASKID>-short` and push a PR
3. When PR is ready, mark task done with the `PR:` metadata

```

Agents should only need the context file + their generated todo to start work.

---

## agent\_configs.yml (example)

```yaml
agents:
  - name: backend
    tag_match: backend
    output: todo/generated/todo_backend.md
  - name: frontend
    tag_match: frontend
    output: todo/generated/todo_frontend.md
  - name: ai
    tag_match: ai
    output: todo/generated/todo_ai.md
```

The `tag_match` is a simple substring match of the `#tags:` field. Advanced users can extend the script to use regex.

---

## Scripts

Below are two scripts: `splitMaster.ts` and `mergeAgentUpdates.ts` (run with Bun). The Python examples that follow are optional alternatives; prefer the TS versions in this repo.

### splitMaster.ts

- Reads `todo/MASTER_TODO.md`
- For each task, checks `#tags:` and writes to the per-agent file declared in `agent_configs.yml`
- Also writes `todo/generated/all_tasks_index.md` with a table of tasks + status

```python
# scripts/split_master.py
import re
import os
import yaml
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MASTER = ROOT / 'todo' / 'MASTER_TODO.md'
CONFIG = ROOT / 'todo' / 'agent_configs.yml'
OUTDIR = ROOT / 'todo' / 'generated'

TASK_RE = re.compile(r'^- \[( |x)\] ?([^:]+): ?(.+?)\s*(#tags:\s*([^@\n]+))?(.*)$')


def parse_master(master_text):
    tasks = []
    for line in master_text.splitlines():
        m = TASK_RE.match(line)
        if not m:
            continue
        checked = m.group(1) == 'x'
        id_part = m.group(2).strip()
        title = m.group(3).strip()
        tags_raw = m.group(5) or ''
        rest = m.group(6) or ''
        tags = [t.strip() for t in tags_raw.split(',') if t.strip()]
        tasks.append({'id': id_part, 'title': title, 'checked': checked, 'tags': tags, 'raw': line, 'meta': rest})
    return tasks


def load_config():
    with open(CONFIG,'r') as f:
        return yaml.safe_load(f)


def main():
    OUTDIR.mkdir(parents=True, exist_ok=True)
    cfg = load_config()
    master_text = MASTER.read_text()
    tasks = parse_master(master_text)

    # Prepare outputs
    agent_files = {a['name']: [] for a in cfg['agents']}
    unassigned = []

    for t in tasks:
        matched = False
        for a in cfg['agents']:
            if any(a['tag_match'] in tg for tg in t['tags']):
                agent_files[a['name']].append(t)
                matched = True
        if not matched:
            unassigned.append(t)

    # write per-agent files
    for a in cfg['agents']:
        outp = OUTDIR / Path(a['output']).name
        lines = [f"# TODO for {a['name']}\n\n"]
        for t in agent_files[a['name']]:
            chk = 'x' if t['checked'] else ' '
            lines.append(t['raw'])
        outp.write_text('\n'.join(lines))
        print('wrote', outp)

    # unassigned
    if unassigned:
        outp = OUTDIR / 'todo_unassigned.md'
        lines = ['# Unassigned tasks\n\n']
        for t in unassigned:
            lines.append(t['raw'])
        outp.write_text('\n'.join(lines))
        print('wrote', outp)

if __name__ == '__main__':
    main()
```

### merge\_agent\_updates.py (simple)

- Each agent when they finish a task will:
  - mark the task `- [x]` in their generated file
  - optionally add `PR: <url>` or `COMMIT: <hash>` metadata
- `merge_agent_updates.py` reads all generated files and reconciles `checked` state and `PR` metadata back into `MASTER_TODO.md`.

```python
# scripts/merge_agent_updates.py
import re
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
MASTER = ROOT / 'todo' / 'MASTER_TODO.md'
OUTDIR = ROOT / 'todo' / 'generated'

TASK_RE = re.compile(r'^- \[( |x)\] ?([^:]+): ?(.+)$')


def read_agent_file(p):
    out = {}
    for line in p.read_text().splitlines():
        m = TASK_RE.match(line)
        if not m: continue
        checked = m.group(1) == 'x'
        tid = m.group(2).strip()
        out[tid] = {'checked': checked, 'raw': line}
    return out


def main():
    master_lines = MASTER.read_text().splitlines()
    agent_states = {}
    for f in OUTDIR.glob('todo_*.md'):
        agent_states.update(read_agent_file(f))

    new_master = []
    for line in master_lines:
        m = TASK_RE.match(line)
        if not m:
            new_master.append(line)
            continue
        tid = m.group(2).strip()
        if tid in agent_states:
            checked = 'x' if agent_states[tid]['checked'] else ' '
            new_master.append(f"- [{checked}] {tid}: {m.group(3)}")
        else:
            new_master.append(line)

    MASTER.write_text('\n'.join(new_master))
    print('Master TODO updated from generated files')

if __name__ == '__main__':
    main()
```

**Notes & improvements**

- These scripts are intentionally minimal and can be extended to copy `PR:` metadata, timestamps, and more complex merging rules.
- Consider using `python-markdown` or an AST-based markdown parser if your tasks get more complex.
- Add a dry-run flag and unit tests for safety.

---

## Git & workflow recommendations

- Option A: Keep `todo/generated/` in `.gitignore`. Agents work off generated files locally, push code PRs and the manager runs `mergeAgentUpdates.ts` to update the master.
- Option B: Commit `todo/generated/` and let agents open PRs against their generated TODO updates. Add a lightweight review step.

**Branching pattern for agents**

1. Agent picks `BE-123` from `todo/generated/todo_backend.md`
2. Creates branch `task/BE-123-add-login` and implements work
3. Opens PR with `TASK: BE-123` in description
4. Once PR merged, agent updates their generated file or manager runs merge script

**Optional git hooks**

- pre-commit: run `scripts/splitMaster.ts` to ensure generated files are in sync
- pre-push (manager): run `scripts/mergeAgentUpdates.ts` then commit updated MASTER\_TODO.md

---

## Additional features & enhancements (roadmap)

- Web dashboard that reads `MASTER_TODO.md` and `agent_configs.yml` and shows per-agent queues and progress.
- Use task unique IDs with a tiny SQLite DB for heavy projects.
- Integrate with issue trackers (GitHub issues) — sync MASTER\_TODO <-> issue tracker bi-directionally.
- Add automatic dependency graph rendering using `graphviz`.

---

## Example `MASTER_TODO.md` (starter)

```md
# MASTER TODO

- [ ] BE-001: Implement /api/login route — validate credentials, issue JWT.  #tags: backend,auth  @priority:high  @est:4h
- [ ] FE-002: Login page — username/password form, validations, call /api/login.  #tags: frontend,auth  @priority:high  @est:6h  @depends:BE-001
- [ ] AI-101: Preprocess chit-chat dataset — filter duplicates, normalize text.  #tags: ai,ml  @priority:medium  @est:3h
```

---

## Next steps I can help with

- Add CI hooks and a GH Action that runs `splitMaster.ts` on pushes and `mergeAgentUpdates.ts` on PR merges.
- Provide a tiny web UI (FastAPI + simple frontend) that shows the master + per-agent filters.
- Convert this simple YAML-based config into a more expressive DSL (if you need regex-based matching).

---

*End of document.*

