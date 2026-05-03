# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Feature 06 (Project APIs) — complete

## Current Goal

- Feature 07 (TBD)

## Completed

- Feature 01: Design System — shadcn/ui (v4.6.0) initialized for Tailwind v4 with `components.json` (style: new-york, baseColor: neutral, cssVariables, lucide icons). Dark-only theme tokens defined in app/globals.css under `:root` with project palette (--bg-base/surface/elevated/subtle, --text-primary/secondary/muted/faint, --accent-primary/-dim, --accent-ai/-text, --state-error/success/warning) and aliased into shadcn's `--background`/`--foreground`/`--card`/`--primary`/etc. plus a `@theme inline` block exposing utilities (`bg-base`, `text-copy-primary`, `border-surface-border`, `text-brand`, `bg-accent-dim`, `text-accent-ai-text`, ...). Button/Card/Dialog/Input/Tabs/Textarea/ScrollArea generated under components/ui/ (untouched). lib/utils.ts exports `cn()` via clsx + tailwind-merge. Dependencies: clsx, tailwind-merge, lucide-react, radix-ui, class-variance-authority. app/layout.tsx body now uses `bg-base text-copy-primary`. `npm run lint`, `npx tsc --noEmit`, and `npm run build` all pass.
- Feature 02: Editor Chrome — EditorNavbar (fixed top bar with PanelLeftOpen/PanelLeftClose toggle) and ProjectSidebar (fixed overlay, slides from left, Projects title + close button, My Projects/Shared tabs with empty states, New Project button) added to components/editor/. Dialog pattern confirmed ready via existing components/ui/dialog.tsx. TypeScript and ESLint clean.
- Feature 04: Project Dialogs — `hooks/use-project-actions.ts` (rename + delete state, `handleDelete` with loading guard), `isOwner` computed in `app/editor/[roomId]/page.tsx` via parallel `Promise.all([getAccessibleProject, getCurrentProjectIdentity])`, `EditorSidebar` extended with `Pencil`/`Trash2` buttons (owner-gated), `EditorWorkspaceClient` extended with local `projectName` state, Rename dialog (prefilled input, auto-focus via `onOpenAutoFocus`, Enter submits), Delete dialog (destructive confirm, loading guard, redirect to `/editor` on success), and V3 mobile backdrop scrim (`fixed inset-0 z-10 bg-black/40 md:hidden` closes sidebar on tap). `tsc --noEmit` and `pnpm lint` pass clean.
- Feature 06: Project APIs — routes already built in Feature 03 (Auth). Shaping confirmed all requirements satisfied by CURRENT: `GET/POST /api/projects` and `PATCH/DELETE /api/projects/[projectId]` with `401`/`403` guards and owner-only enforcement. No implementation work needed.
- Feature 05: Prisma Schema & Client Alignment — aligned schema to spec: added `description String?` and `@@index([createdAt])` to Project; added `ProjectStatus` enum (`DRAFT | ARCHIVED`) replacing plain String status; renamed `canvasBlobUrl` → `canvasJsonPath`; added `@@index([projectId, addedAt])` to ProjectCollaborator; rewrote `lib/prisma.ts` to branch by DATABASE_URL prefix (`prisma+postgres://` → Accelerate via `@prisma/extension-accelerate`, else → `@prisma/adapter-pg` with `pg.Pool`); installed `@prisma/adapter-pg@6.19.3`, `pg`, `@types/pg`, `@prisma/extension-accelerate`; removed stale `prisma/models/project.prisma`; migration `20260503051206_align_to_feature_05_spec` applied. `tsc --noEmit` passes clean. Note: `npm run build` fails on Liveblocks secret key missing in build env (pre-existing, unrelated to this feature).
- Feature 03: Auth — Clerk middleware (proxy.ts), ClerkProvider with dark appearance, sign-in/sign-up pages, root redirect, Prisma schema (Project/ProjectCollaborator/ProjectSpec/TaskRun in single schema.prisma — prismaSchemaFolder was dropped in favour of single-file), lib/prisma.ts singleton, lib/project-access.ts (getCurrentProjectIdentity, getAccessibleProject, userHasProjectAccess), lib/projects.ts (getProjectsForUser), CRUD API routes (GET/POST projects, PATCH/DELETE project), EditorHomeClient with inline create/rename/delete, editor/[roomId]/page.tsx access gate, AccessDenied, EditorWorkspaceClient stub, lib/liveblocks.ts with getUserColor, lib/project-collaborators.ts (getProjectShareDetails with Clerk enrichment), collaborators API (GET/POST/DELETE), liveblocks-auth endpoint, liveblocks.config.ts UserMeta declaration. `tsc --noEmit` and `npm run lint` pass. Prisma migration (`npx prisma migrate dev --name add-project-model`) must be run by the user after setting DATABASE_URL in .env.local.

## In Progress

- None.

## Next Up

- Feature 07 (TBD)

## Open Questions

- None yet.

## Architecture Decisions

- shadcn/ui over Tailwind v4 (CSS-based token config via @theme inline in globals.css, no tailwind.config.js).
- Dark-only theme: all shadcn :root variables set to dark values directly — no .dark class switching.
- Do not modify generated components/ui/* files after shadcn installation.
- Next.js 16 uses proxy.ts (not middleware.ts) — same API, renamed to reflect its purpose.
- Prisma pinned to v6.x — v7 removes `datasource.url` from `schema.prisma`, requires `prisma.config.ts`, and mandates `@prisma/adapter-pg` for `PrismaClient`. Accidentally upgraded via `npm i prisma@latest` on 2026-05-02; immediately reverted. Generator stays `prisma-client-js`, schema keeps `url = env("DATABASE_URL")`.

## Session Notes

- Using Next.js 16.2.4 with React 19 and Tailwind CSS v4.
- shadcn version 4.5.0 was used; it auto-detected Tailwind v4.
- lucide-react ^1.11.0 installed as a direct dependency.
- **2026-05-02 — Runtime debug session.** Resolved two blocking errors before Feature 04 work could begin:
  1. `.next` cache corruption (SWC helpers module hash mismatch under Turbopack) — fixed by deleting `.next` and letting it rebuild clean.
  2. `PrismaClientInitializationError` / "page hangs after login" — root cause was PostgreSQL not running. Prisma's connection attempt stalls visibly before throwing. PostgreSQL must be started manually in WSL2 (`sudo service postgresql start`) before running `pnpm dev`.
  3. `proxy.ts` is the correct middleware filename for Next.js 16 (`middleware.ts` is deprecated). Next.js prints a warning and the timing output labels its own internal proxy layer as `proxy.ts` — this is unrelated to the user's `proxy.ts` file. Do not rename the file.
- PostgreSQL runs in Docker (`ghostai-dev` container), not as a system service. Start it with `docker start ghostai-dev` at the beginning of every dev session.
