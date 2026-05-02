# V2: Project CRUD — Implementation Plan

## Goal

Wire a PostgreSQL-backed `Project` and `ProjectCollaborator` model into the app. Expose a server-side identity helper (`getCurrentProjectIdentity`) and a data helper (`getProjectsForUser`). Back both with a thin CRUD API (GET / POST / PATCH / DELETE). Replace the static editor home shell with `<EditorHomeClient>`, which fetches the project list on mount and lets the owner create, rename, and delete projects inline.

---

## Affordances

| ID  | Type   | Place                                          | Name                        | Wires Out                                                    |
| --- | ------ | ---------------------------------------------- | --------------------------- | ------------------------------------------------------------ |
| N3  | Non-UI | `lib/project-access.ts`                        | `getCurrentProjectIdentity` | → Clerk `auth()`, `currentUser()`                            |
| N5  | Non-UI | `lib/projects.ts`                              | `getProjectsForUser`        | → Prisma (`Project`, `ProjectCollaborator`)                  |
| N7  | Non-UI | `app/api/projects/route.ts`                    | GET / POST                  | → Prisma                                                     |
| N8  | Non-UI | `app/api/projects/[projectId]/route.ts`        | PATCH / DELETE              | → Prisma                                                     |
| U3  | UI     | `app/editor/page.tsx` + `EditorHomeClient`     | `<EditorHomeClient>`        | → N7 (list, create), N8 (rename, delete)                     |

---

## Files

| File | Action | Notes |
|------|--------|-------|
| `prisma/schema.prisma` | modify | Switch to multi-file schema by adding `prismaSchemaFolder` preview feature and pointing `generator` output to `prisma/generated/client` |
| `prisma/models/project.prisma` | create | `Project`, `ProjectCollaborator`, `ProjectSpec`, `TaskRun` models (see Implementation Steps §1) |
| `lib/prisma.ts` | create | Singleton Prisma client (`PrismaClient` via global cache for dev hot-reload safety) |
| `lib/project-access.ts` | create | `getCurrentProjectIdentity()` — calls `auth()` and `currentUser()`, returns `{ userId, email, name, imageUrl }` or throws if unauthenticated |
| `lib/projects.ts` | create | `getProjectsForUser(userId, userEmail)` — returns `{ owned: Project[], shared: Project[] }` |
| `app/api/projects/route.ts` | create | `GET` list owned projects; `POST` create project. Both call `getCurrentProjectIdentity()` |
| `app/api/projects/[projectId]/route.ts` | create | `PATCH` rename (owner only); `DELETE` delete (owner only, cascades via DB). Both verify ownership |
| `app/editor/page.tsx` | modify | Server component: calls `getProjectsForUser()`, passes `owned` and `shared` arrays to `<EditorHomeClient>` |
| `components/editor/EditorHomeClient.tsx` | create | `"use client"` — renders two sections ("My Projects", "Shared with me"). Handles create / rename / delete via fetch calls to N7/N8 |
| `next.config.ts` | modify | No change needed for this slice — prismaSchemaFolder is a Prisma-level flag, not a Next.js flag |

---

## Implementation Steps

### 1. Prisma multi-file schema

Rename `prisma/schema.prisma` generator `output` to `../node_modules/.prisma/client` (default) and add the `prismaSchemaFolder` preview feature so Prisma loads all `.prisma` files in `prisma/models/`:

```prisma
// prisma/schema.prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["prismaSchemaFolder"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Create `prisma/models/project.prisma`:

```prisma
model Project {
  id            String   @id @default(cuid())
  ownerId       String                          // Clerk userId
  name          String
  status        String   @default("active")
  canvasBlobUrl String?                         // Vercel Blob URL (set in later slices)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  collaborators ProjectCollaborator[]
  specs         ProjectSpec[]
  taskRuns      TaskRun[]

  @@index([ownerId])
}

model ProjectCollaborator {
  id        String   @id @default(cuid())
  projectId String
  email     String
  addedAt   DateTime @default(now())

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@unique([projectId, email])
  @@index([email])
}

model ProjectSpec {
  id        String   @id @default(cuid())
  projectId String
  filePath  String                              // Vercel Blob URL to Markdown spec
  createdAt DateTime @default(now())

  project  Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)
  taskRuns TaskRun[]

  @@index([projectId])
}

model TaskRun {
  id          String    @id @default(cuid())
  projectId   String
  specId      String?
  triggerId   String?                           // Trigger.dev run ID
  type        String                            // "design" | "spec"
  status      String    @default("pending")    // "pending" | "running" | "completed" | "failed"
  startedAt   DateTime?
  completedAt DateTime?
  createdAt   DateTime  @default(now())

  project Project      @relation(fields: [projectId], references: [id], onDelete: Cascade)
  spec    ProjectSpec? @relation(fields: [specId], references: [id])

  @@index([projectId])
}
```

Run `npx prisma migrate dev --name add-project-model` after writing these files.

### 2. Prisma client singleton (`lib/prisma.ts`)

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

### 3. `getCurrentProjectIdentity` (`lib/project-access.ts`)

Server-only helper (no `"use client"` — safe to call from server components and route handlers).

```ts
import { auth, currentUser } from "@clerk/nextjs/server";

export interface ProjectIdentity {
  userId: string;
  email: string;
  name: string;
  imageUrl: string;
}

export async function getCurrentProjectIdentity(): Promise<ProjectIdentity> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthenticated");

  const user = await currentUser();
  if (!user) throw new Error("User not found");

  const email = user.emailAddresses[0]?.emailAddress ?? "";

  return {
    userId,
    email,
    name: [user.firstName, user.lastName].filter(Boolean).join(" ") || email,
    imageUrl: user.imageUrl,
  };
}
```

### 4. `getProjectsForUser` (`lib/projects.ts`)

```ts
import { prisma } from "@/lib/prisma";
import type { Project } from "@prisma/client";

export interface ProjectsForUser {
  owned: Project[];
  shared: Project[];
}

export async function getProjectsForUser(
  userId: string,
  userEmail: string
): Promise<ProjectsForUser> {
  const [owned, sharedLinks] = await Promise.all([
    prisma.project.findMany({
      where: { ownerId: userId },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.projectCollaborator.findMany({
      where: { email: userEmail },
      include: {
        project: true,
      },
    }),
  ]);

  const shared = sharedLinks
    .map((link) => link.project)
    .filter((p) => p.ownerId !== userId); // exclude own projects that also have self as collaborator

  return { owned, shared };
}
```

### 5. `GET /api/projects` and `POST /api/projects` (`app/api/projects/route.ts`)

```ts
import { NextResponse } from "next/server";
import { getCurrentProjectIdentity } from "@/lib/project-access";
import { getProjectsForUser } from "@/lib/projects";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const identity = await getCurrentProjectIdentity().catch(() => null);
  if (!identity) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { owned, shared } = await getProjectsForUser(identity.userId, identity.email);
  return NextResponse.json({ owned, shared });
}

export async function POST(request: Request) {
  const identity = await getCurrentProjectIdentity().catch(() => null);
  if (!identity) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const name: string = typeof body?.name === "string" && body.name.trim()
    ? body.name.trim()
    : "Untitled Project";

  const project = await prisma.project.create({
    data: {
      ownerId: identity.userId,
      name,
    },
  });

  return NextResponse.json(project, { status: 201 });
}
```

### 6. `PATCH /api/projects/[projectId]` and `DELETE /api/projects/[projectId]` (`app/api/projects/[projectId]/route.ts`)

```ts
import { NextResponse } from "next/server";
import { getCurrentProjectIdentity } from "@/lib/project-access";
import { prisma } from "@/lib/prisma";

interface RouteContext {
  params: Promise<{ projectId: string }>;
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const identity = await getCurrentProjectIdentity().catch(() => null);
  if (!identity) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { projectId } = await params;
  const existing = await prisma.project.findUnique({ where: { id: projectId } });

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.ownerId !== identity.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const name: string | undefined =
    typeof body?.name === "string" && body.name.trim() ? body.name.trim() : undefined;

  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const updated = await prisma.project.update({
    where: { id: projectId },
    data: { name },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const identity = await getCurrentProjectIdentity().catch(() => null);
  if (!identity) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const { projectId } = await params;
  const existing = await prisma.project.findUnique({ where: { id: projectId } });

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.ownerId !== identity.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.project.delete({ where: { id: projectId } });
  return new NextResponse(null, { status: 204 });
}
```

Note: `params` in Next.js 16 app router route handlers is a `Promise` — always `await params` before destructuring.

### 7. Editor home server component (`app/editor/page.tsx`)

Replace the current static stub with a server component that fetches projects and passes them to `<EditorHomeClient>`.

```ts
import { getCurrentProjectIdentity } from "@/lib/project-access";
import { getProjectsForUser } from "@/lib/projects";
import { EditorHomeClient } from "@/components/editor/EditorHomeClient";

export default async function EditorPage() {
  const identity = await getCurrentProjectIdentity();
  const { owned, shared } = await getProjectsForUser(identity.userId, identity.email);

  return <EditorHomeClient owned={owned} shared={shared} />;
}
```

`getCurrentProjectIdentity` will throw if unauthenticated; the Clerk middleware from V1 guarantees the user is signed in before this runs, so no extra null-check is needed here.

### 8. `<EditorHomeClient>` (`components/editor/EditorHomeClient.tsx`)

Client component. Accepts `owned` and `shared` as initial props, manages local state, and calls the API for mutations.

```ts
"use client";

import { useState } from "react";
import type { Project } from "@prisma/client";

interface Props {
  owned: Project[];
  shared: Project[];
}
```

**Interactions:**

- **Create:** `POST /api/projects` with `{ name: "Untitled Project" }`. On success, prepend to `owned` state. Immediately begin inline rename so the user can type the real name.
- **Rename:** Render an `<input>` when a project row enters edit mode. On blur or Enter, `PATCH /api/projects/[id]` with `{ name }`. On success, update local state.
- **Delete:** Show a confirmation `<Dialog>` (from `components/ui/dialog.tsx`). On confirm, `DELETE /api/projects/[id]`. On success, remove from local state.

**Layout** (dark-only, using design tokens):

- Outer: `bg-base min-h-screen` with a centred content column.
- Section headings: `text-copy-secondary text-sm font-medium uppercase tracking-wider`.
- Project card row: `bg-surface border border-surface-border rounded-2xl px-4 py-3 flex items-center gap-3 hover:bg-elevated transition-colors`.
- Project name in edit mode: `<Input>` from `components/ui/input.tsx`, auto-focused.
- "New Project" button: `<Button variant="outline">` from `components/ui/button.tsx`, with a `+` icon from `lucide-react`.
- Empty state: centered muted text within the section.
- Shared projects section is read-only in this slice — rename and delete are owner-only and not exposed for shared projects.

### 9. Install Prisma

Prisma is not yet in `package.json`. Add it:

```bash
npm install prisma @prisma/client
npx prisma init --datasource-provider postgresql
```

Then replace the generated `prisma/schema.prisma` with the multi-file config from Step 1, create `prisma/models/project.prisma`, and run `npx prisma migrate dev --name add-project-model`.

---

## Env Vars Required

| Variable       | Purpose                                                  |
| -------------- | -------------------------------------------------------- |
| `DATABASE_URL` | PostgreSQL connection string (used by Prisma at runtime) |

`NEXT_PUBLIC_CLERK_*` and `CLERK_SECRET_KEY` are already required from V1 and must remain set.

---

## Acceptance

- [ ] `npx prisma migrate dev` succeeds and creates the `Project`, `ProjectCollaborator`, `ProjectSpec`, and `TaskRun` tables in PostgreSQL
- [ ] `GET /api/projects` returns `{ owned: [], shared: [] }` for a newly signed-in user
- [ ] `POST /api/projects` with `{ "name": "My App" }` returns `201` and a `Project` record with the caller's `userId` as `ownerId`
- [ ] `GET /api/projects` after creation returns the new project in the `owned` array
- [ ] `PATCH /api/projects/[projectId]` with `{ "name": "Renamed" }` returns `200` and the updated record
- [ ] `DELETE /api/projects/[projectId]` returns `204` and the project no longer appears in `GET`
- [ ] `PATCH` or `DELETE` by a different user returns `403`
- [ ] `PATCH` or `DELETE` for a non-existent project ID returns `404`
- [ ] Navigating to `/editor` renders the "My Projects" section (initially empty)
- [ ] Clicking "New Project" from `<EditorHomeClient>` creates a project and it appears in the list
- [ ] Renaming a project in the list updates the displayed name
- [ ] Deleting a project (confirmed via dialog) removes it from the list
- [ ] Shared projects appear under "Shared with me" when a `ProjectCollaborator` row exists for the user's email
- [ ] `npm run build` and `npx tsc --noEmit` both pass with no errors
