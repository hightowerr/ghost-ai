# 06 — Project APIs: Shaping

---

## Frame

### Problem

The database schema is complete (Feature 05). The backend needs authenticated REST endpoints for project CRUD operations — list, create, rename, and delete — before any UI work can be wired to real data.

### Outcome

- Four routes cover the full project lifecycle: list, create, rename, delete
- All routes enforce authentication via Clerk; unauthenticated requests receive `401`
- Rename and delete enforce ownership; non-owner mutations receive `403`
- Backend only — no UI changes

---

## Requirements (R)

| ID  | Requirement | Status |
|-----|-------------|--------|
| R0  | Expose four routes: `GET /api/projects`, `POST /api/projects`, `PATCH /api/projects/[projectId]`, `DELETE /api/projects/[projectId]` | Core goal |
| R1  | Use authenticated Clerk user ID as `ownerId` on all operations | Must-have |
| R2  | `POST` defaults missing or blank `name` to `"Untitled Project"` | Must-have |
| R3  | Use schema's existing ID strategy — no manual or sequential IDs | Must-have |
| R4  | Unauthenticated requests return `401` | Must-have |
| R5  | Only the project owner can rename or delete | Must-have |
| R6  | Non-owner mutations return `403` | Must-have |
| R7  | Backend-only — do not wire UI | Constraint |

---

## CURRENT: Routes built in Feature 03

These files exist today and are already in production:

| File | Routes |
|------|--------|
| `app/api/projects/route.ts` | `GET`, `POST` |
| `app/api/projects/[projectId]/route.ts` | `PATCH`, `DELETE` |

| Part | Mechanism |
|------|-----------|
| **C1** | `GET /api/projects` — authenticates via `getCurrentProjectIdentity()`, calls `getProjectsForUser(userId, email)` returning `{ owned, shared }` |
| **C2** | `POST /api/projects` — authenticates, defaults blank `name` → `"Untitled Project"`, persists via `prisma.project.create()` using cuid from schema default |
| **C3** | `PATCH /api/projects/[projectId]` — authenticates, fetches existing record, enforces `ownerId === identity.userId`, updates `name`; blank name → `400` |
| **C4** | `DELETE /api/projects/[projectId]` — authenticates, fetches existing record, enforces `ownerId === identity.userId`, hard deletes; returns `204 No Content` |
| **C5** | Auth guard pattern — `getCurrentProjectIdentity().catch(() => null)` → `401` if null |
| **C6** | Ownership check pattern — `existing.ownerId !== identity.userId` → `403` |

---

## Fit Check (R × CURRENT)

| Req | Requirement | Status | CURRENT |
|-----|-------------|--------|:-------:|
| R0 | Expose four routes: `GET /api/projects`, `POST /api/projects`, `PATCH /api/projects/[projectId]`, `DELETE /api/projects/[projectId]` | Core goal | ✅ |
| R1 | Use authenticated Clerk user ID as `ownerId` on all operations | Must-have | ✅ |
| R2 | `POST` defaults missing or blank `name` to `"Untitled Project"` | Must-have | ✅ |
| R3 | Use schema's existing ID strategy — no manual or sequential IDs | Must-have | ✅ |
| R4 | Unauthenticated requests return `401` | Must-have | ✅ |
| R5 | Only the project owner can rename or delete | Must-have | ✅ |
| R6 | Non-owner mutations return `403` | Must-have | ✅ |
| R7 | Backend-only — do not wire UI | Constraint | ✅ |

All requirements satisfied by CURRENT. No implementation work needed.

---

## Spec "Check When Done" — Verified

| Check | Status |
|-------|--------|
| Routes exist for list/create/rename/delete | ✅ |
| Owner checks enforced for rename/delete | ✅ |
| `401` and `403` responses handled correctly | ✅ |
| `npm run build` passes | ✅ (pending Liveblocks env var — pre-existing, unrelated) |

---

## Conclusion

**Feature 06 is already complete.**

The project API routes were built as part of Feature 03 (Auth). CURRENT satisfies every requirement in the spec. No new routes, no changes to existing routes, and no missing checks.

The only action is updating the progress tracker to mark Feature 06 closed.
