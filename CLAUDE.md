CLAUDE.md - CORE SYSTEM RULES

### ## Application Building Context
Read the following files in order before implementing or making any architectural decision:

1. `context/project-overview.md` — product definition, goals, features, and scope
2. `context/architecture-context.md` — system structure, boundaries, storage model, and invariants
3. `context/ui-context.md` — theme, colors, typography, canvas design, and component conventions
4. `context/code-standards.md` — implementation rules and conventions
5. `context/ai-workflow-rules.md` — development workflow, scoping rules, and delivery approach
6. `context/progress-tracker.md` — current phase, completed work, open questions, and next steps

Update `context/progress-tracker.md` after each meaningful implementation change.

If implementation changes the architecture, scope, or standards documented in the context files, update the relevant file before continuing.

---

### ## Project Context
* Trigger.dev (v4) Implementation
* Environment: WSL2 / Ubuntu on Windows
* Package Manager: `pnpm` or `bun` (never `npm`)
* **Prisma: stay on v6.x.** Do not upgrade to Prisma v7+. v7 is a breaking change: it removes `url` from `schema.prisma`, requires a `prisma.config.ts` for all CLI operations, and mandates a driver adapter for `PrismaClient`. All existing code targets the v6 API. If a task suggests upgrading, decline it.

### ## Environment Rules
* ALWAYS use bash/Unix syntax (`ls`, `rm`, `cat`). Never PowerShell.
* ALWAYS use forward slashes (`/home/...`).
* Assume a strict POSIX environment.

### ## Core Trigger.dev Constraints
* MUST use `@trigger.dev/sdk`.
* NEVER use v2 deprecated APIs (e.g., `client.defineJob`).
* NEVER wrap `triggerAndWait`, `batchTriggerAndWait`, or `wait` calls in `Promise.all` or `Promise.allSettled`.
* Use SDK (`@trigger.dev/sdk`) and check `result.ok` before accessing `result.output`.

---

### ## WHEN IT GETS LONG - SPLIT IT:
Claude reads CLAUDE.md every time.
It reads the linked files only when relevant.

docs/trigger-dev/
├── "See context\trigger-dev\tasks.md for task definition, batching, waits, and schedules"
├── "See context\trigger-dev\advanced.md for debouncing, idempotency, machines, and queues"
├── "See context\trigger-dev\realtime.md for streams, React hooks, and run subscriptions"
└── "See context\trigger-dev\config.md for trigger.config.ts and build extensions"

## Environment

This project runs in WSL2 / Ubuntu on Windows. All shell commands must use bash syntax — never PowerShell or cmd.

- Use bash/Unix commands (`ls`, `rm`, `mv`, `cat`, `grep`, etc.), not PowerShell equivalents (`Get-ChildItem`, `Remove-Item`, etc.)
- Use forward slashes in paths (`/home/yink-work/...`), not backslashes
- Do not use Windows-style paths (`C:\Users\...`) — use the WSL mount equivalent (`/mnt/c/Users/...`) only when genuinely accessing the Windows filesystem
- Assume a POSIX environment: bash, coreutils, standard Unix tooling
- Package managers: prefer `pnpm` or `bun` over `npm` for Node projects

