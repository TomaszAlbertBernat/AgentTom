# Project Backlog

This directory contains the project's task management and planning documents.

## 📋 Files

- **`BACKLOG.md`** - Main task list with priorities and status

## 🚀 Getting Started

1. **View current tasks**: Open `BACKLOG.md`
2. **Pick a task**: Choose from P0 (urgent) or P1 (next) sections
3. **Update status**: Move completed tasks to the ✅ Completed section

## 📝 Adding New Tasks

Use this format in `BACKLOG.md`:
```markdown
- [ ] ID: Brief description — detailed explanation
  `#tags` `@est:time` `@depends:other-id` `@ac:acceptance criteria`
```

**Example:**
```markdown
- [ ] BE-005: Add user logout endpoint — POST /api/logout, invalidate token
  `#backend #auth` `@est:2h` `@ac:returns 200, token becomes invalid`
```

## 🏷️ Tags

**Tags**: `backend`, `frontend`, `ai`, `docs`, `tools`, `auth`, `chat`, `ux`, `ci`, `data`, `testing`  
**Priorities**: P0 (urgent), P1 (next), P2 (later)

---

Keep it simple. Focus on what needs to be done, not complex systems.
