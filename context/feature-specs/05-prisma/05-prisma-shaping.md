# 05 — Prisma Schema & Client Alignment — Shaping Doc

## Context

Feature 03 (Auth) bootstrapped the Prisma schema and `lib/prisma.ts` singleton as part of a broader auth implementation. That work got the system running but diverged from the Feature 05 spec in several ways:

- `status` was stored as a plain `String` with `@default("active")`, not a typed enum
- The blob field was named `canvasBlobUrl`, not `canvasJsonPath`
- `description` was never added to `Project`
- Several indexes from the spec are missing
- `lib/prisma.ts` is a bare singleton — no Accelerate/pg branching
- `@prisma/adapter-pg` and `pg` are **not installed** despite the spec saying "already installed"

The goal of this feature is to align the schema and client with the spec.

---

## Requirements (R)

| ID | Requirement | Status |
|----|-------------|--------|
| R0 | Align Prisma schema and Prisma client to the Feature 05 spec | Core goal |
| R1 | `Project` model includes `description String?` and `@@index([createdAt])` | Must-have |
| R2 | `Project.status` is a typed `ProjectStatus` enum `{ DRAFT ARCHIVED }` (not plain `String`) | Undecided |
| R3 | `Project` blob path field is named `canvasJsonPath` (currently `canvasBlobUrl`) | Undecided |
| R4 | `ProjectCollaborator` has `@@index([projectId, addedAt])` | Must-have |
| R5 | `lib/prisma.ts` branches by `DATABASE_URL` prefix: `prisma+postgres://` → Accelerate, else → `@prisma/adapter-pg` | Must-have |
| R6 | Missing dependencies are installed: `@prisma/adapter-pg`, `pg`, `@types/pg` | Must-have |
| R7 | Migration runs cleanly and `npm run build` passes | Must-have |
| R8 | Schema stays in `prisma/schema.prisma` (single file — multi-file was tried and dropped in Feature 03) | Must-have |

**Notes on R2 and R3 (Undecided):**
- R2 requires a breaking migration: create a PostgreSQL enum type, alter the column type, and update the default. The spec calls for it; no TypeScript code currently reads `project.status` so code impact is zero.
- R3 requires a column rename migration. No TypeScript code in `lib/` or `app/` references `canvasBlobUrl` — the grep confirms it's schema-only. Rename impact is low.
- Both are marked Undecided because they require destructive migrations on a live schema. We should confirm before proceeding.

---

## CURRENT

The existing state, for reference.

| Part | Mechanism |
|------|-----------|
| **C1** | `prisma/schema.prisma` — single file with `Project`, `ProjectCollaborator`, `ProjectSpec`, `TaskRun` |
| **C2** | `Project`: `status String @default("active")`, `canvasBlobUrl String?`, no `description`, `@@index([ownerId])` only |
| **C3** | `ProjectCollaborator`: `@@unique([projectId, email])`, `@@index([email])` — missing `@@index([projectId, addedAt])` |
| **C4** | `lib/prisma.ts` — bare `new PrismaClient()` singleton cached on `globalThis`, no driver adapter |
| **C5** | `@prisma/adapter-pg` and `pg` — **not installed** (spec says they are; package.json says they are not) |
| **C6** | One migration (`20260502192345_init`) — created the initial tables |

---

## Shape A — Additive delta (safe path)

Add only what's missing without touching existing column names or types.

| Part | Mechanism | Flag |
|------|-----------|:----:|
| **A1** | Add `description String?` to `Project` in `schema.prisma` | |
| **A2** | Add `@@index([createdAt])` to `Project` | |
| **A3** | Add `@@index([projectId, addedAt])` to `ProjectCollaborator` | |
| **A4** | Install `@prisma/adapter-pg`, `pg`, `@types/pg` | |
| **A5** | Rewrite `lib/prisma.ts`: branch on `DATABASE_URL` prefix — `prisma+postgres://` → Accelerate extension, else → `PrismaPg` adapter with `pg.Pool` | ⚠️ |
| **A6** | Run `prisma migrate dev --name add-description-indexes-pg-adapter` | |

**⚠️ A5 flag:** The Accelerate path requires `@prisma/extension-accelerate`. This package is not installed and its exact v6 API needs verification before implementation.

---

## Shape B — Full spec alignment

Everything in Shape A plus enum migration and field rename.

| Part | Mechanism | Flag |
|------|-----------|:----:|
| **B1** | Add `description String?` to `Project` | |
| **B2** | Add `@@index([createdAt])` to `Project` | |
| **B3** | Add `@@index([projectId, addedAt])` to `ProjectCollaborator` | |
| **B4** | Add `enum ProjectStatus { DRAFT ARCHIVED }` to `schema.prisma`; change `status String @default("active")` → `status ProjectStatus @default(DRAFT)` | |
| **B5** | Rename `canvasBlobUrl String?` → `canvasJsonPath String?` in `schema.prisma` | |
| **B6** | Install `@prisma/adapter-pg`, `pg`, `@types/pg` | |
| **B7** | Rewrite `lib/prisma.ts`: branch on `DATABASE_URL` prefix | ⚠️ |
| **B8** | Run `prisma migrate dev --name align-to-feature-05-spec` — migration includes: `CREATE TYPE`, `ALTER COLUMN ... USING`, `RENAME COLUMN` | |

**⚠️ B7 flag:** Same as A5 — `@prisma/extension-accelerate` v6 API needs verification.

---

## Fit Check

| Req | Requirement | Status | CURRENT | A | B |
|-----|-------------|--------|:-------:|:-:|:-:|
| R0 | Align Prisma schema and Prisma client to the Feature 05 spec | Core goal | ❌ | ❌ | ✅ |
| R1 | `Project` has `description String?` and `@@index([createdAt])` | Must-have | ❌ | ✅ | ✅ |
| R2 | `Project.status` is typed enum `ProjectStatus { DRAFT ARCHIVED }` | Undecided | ❌ | ❌ | ✅ |
| R3 | `Project` blob path field named `canvasJsonPath` (not `canvasBlobUrl`) | Undecided | ❌ | ❌ | ✅ |
| R4 | `ProjectCollaborator` has `@@index([projectId, addedAt])` | Must-have | ❌ | ✅ | ✅ |
| R5 | `lib/prisma.ts` branches by `DATABASE_URL` prefix for Accelerate vs pg | Must-have | ❌ | ✅ | ✅ |
| R6 | Missing deps installed: `@prisma/adapter-pg`, `pg`, `@types/pg` | Must-have | ❌ | ✅ | ✅ |
| R7 | Migration runs, `npm run build` passes | Must-have | ❌ | ✅ | ✅ |
| R8 | Schema stays in `prisma/schema.prisma` (single file) | Must-have | ✅ | ✅ | ✅ |

**Notes:**
- CURRENT fails R7: the init migration is stale relative to spec; a new migration is needed regardless of shape chosen
- A fails R0: leaves two spec deviations in place (`status` type, field name)
- A fails R2: keeps `status String @default("active")` — diverges from spec enum
- A fails R3: keeps `canvasBlobUrl` — diverges from spec field name
- B passes all requirements and is the only shape that fully satisfies R0
- Both A and B have ⚠️ B7/A5 — Accelerate extension dependency needs a spike before implementation

---

## Open Questions

1. **R2 — status enum:** Do we want `DRAFT | ARCHIVED` or keep the existing `String` approach? No code reads it today, so changing is low-risk. But it locks future statuses to enum values.

2. **R3 — field rename:** `canvasBlobUrl` → `canvasJsonPath`: no code references it outside the schema and migration SQL. Rename or leave as-is?

3. **B7 / A5 — Accelerate branching:** Does the project plan to use Prisma Postgres (Accelerate) in production, or is this speculative? If it's speculative, we could skip the branching and use `@prisma/adapter-pg` directly for all connections.

4. **`@prisma/extension-accelerate`:** This package is needed for the Accelerate path. Spike needed to confirm it works with Prisma v6 and the exact API (`$extends(withAccelerate())`).

---

## Recommended Next Step

Resolve R2 and R3 (confirm enum + rename intent), then decide between **Shape A** (conservative) or **Shape B** (full alignment). Once the shape is selected, run a spike on the Accelerate extension before implementing B7/A5.
