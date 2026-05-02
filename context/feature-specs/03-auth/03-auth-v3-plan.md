# V3: Workspace Access Gate — Implementation Plan

**Feature:** 03 Auth
**Slice:** V3 of 4
**Status:** ⏳ PENDING

---

## Goal

Add two new exports to `lib/project-access.ts` — `getAccessibleProject` and `userHasProjectAccess` — and wire them into the `app/editor/[roomId]/page.tsx` server component. When a user navigates to a workspace URL, the page runs an ownership-or-collaborator check against Prisma. Unauthorized users see the `<AccessDenied>` component; authorized users see the `<EditorWorkspaceClient>` shell. The workspace client is a client-boundary stub — it accepts the resolved project and will later wire into the Liveblocks room (V4).

**Demo:** Click an owned project from the editor home → workspace opens (stub canvas shell is fine). Navigate to `/editor/unknown-id` or any project the user does not own or collaborate on → `<AccessDenied>` renders.

---

## Affordances

| ID | Type   | Place                           | Name                      | Wires Out                                            |
|----|--------|---------------------------------|---------------------------|------------------------------------------------------|
| N4 | Non-UI | `lib/project-access.ts`         | `getAccessibleProject`    | → Prisma (`Project` + `ProjectCollaborator` queries) |
| N4 | Non-UI | `lib/project-access.ts`         | `userHasProjectAccess`    | → `getAccessibleProject` (boolean convenience wrap)  |
| U4 | UI     | `app/editor/[roomId]/page.tsx`  | `<EditorWorkspaceClient>` | → N9 (Liveblocks auth, deferred to V4)               |
| U5 | UI     | `app/editor/[roomId]/page.tsx`  | `<AccessDenied>`          | (terminal — no wires out)                            |

---

## Files

| File                                               | Action | Notes                                                                                                    |
|----------------------------------------------------|--------|----------------------------------------------------------------------------------------------------------|
| `lib/project-access.ts`                            | modify | Add `getAccessibleProject` and `userHasProjectAccess` exports; `getCurrentProjectIdentity` stays intact  |
| `app/editor/[roomId]/page.tsx`                     | create | Server component; calls `getAccessibleProject`; renders `<AccessDenied>` or `<EditorWorkspaceClient>`   |
| `components/editor/access-denied.tsx`              | create | Pure UI — no state, no client directive needed                                                           |
| `components/editor/editor-workspace-client.tsx`    | create | `"use client"` stub; accepts `project` prop; renders a full-viewport placeholder for now                 |

---

## Implementation Steps

### 1. Extend `lib/project-access.ts`

The file already exports `getCurrentProjectIdentity`. Add two new exports below it.

**`getAccessibleProject(roomId: string)`**

```ts
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import type { Project } from "@prisma/client";

export async function getAccessibleProject(
  roomId: string
): Promise<Project | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await currentUser();
  if (!user) return null;

  const email = user.emailAddresses[0]?.emailAddress ?? null;

  const project = await prisma.project.findUnique({
    where: { id: roomId },
    include: { collaborators: true },
  });

  if (!project) return null;

  // Owner check
  if (project.ownerId === userId) return project;

  // Collaborator check (email-matched)
  if (email && project.collaborators.some((c) => c.email === email)) {
    return project;
  }

  return null;
}
```

- Uses `prisma.project.findUnique` with `include: { collaborators: true }`.
- Returns `null` for unknown IDs, unauthenticated callers, and non-members.
- Does not throw — the page component decides what to render.

**`userHasProjectAccess(roomId: string)`**

```ts
export async function userHasProjectAccess(roomId: string): Promise<boolean> {
  const project = await getAccessibleProject(roomId);
  return project !== null;
}
```

- Thin boolean wrapper; used by the Liveblocks auth endpoint in V4.

### 2. Create `components/editor/access-denied.tsx`

No client directive — purely presentational.

```tsx
import { ShieldOff } from "lucide-react";

export function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-base gap-4">
      <ShieldOff className="h-8 w-8 text-copy-muted" />
      <p className="text-sm text-copy-muted">
        You do not have access to this project.
      </p>
      <a
        href="/editor"
        className="text-xs text-brand hover:underline"
      >
        Back to projects
      </a>
    </div>
  );
}
```

- Uses `ShieldOff` from `lucide-react` at `h-8 w-8`.
- Tokens: `bg-base`, `text-copy-muted`, `text-brand`.
- Provides a navigation escape back to `/editor`.

### 3. Create `components/editor/editor-workspace-client.tsx`

Stub client component. The `project` prop is typed against the Prisma `Project` model. Actual Liveblocks wiring (N9) is out of scope for this slice.

```tsx
"use client";

import type { Project } from "@prisma/client";

interface EditorWorkspaceClientProps {
  project: Project;
}

export function EditorWorkspaceClient({ project }: EditorWorkspaceClientProps) {
  return (
    <div className="flex flex-col h-screen bg-base">
      <header className="h-12 flex items-center px-4 border-b border-surface-border shrink-0">
        <span className="text-sm font-medium text-copy-primary">
          {project.name}
        </span>
      </header>
      <main className="flex-1" />
    </div>
  );
}
```

- `"use client"` is required — this component will hold Liveblocks hooks in V4.
- Renders the project name in a top bar to confirm the correct project was resolved.
- Tokens: `bg-base`, `border-surface-border`, `text-copy-primary`.

### 4. Create `app/editor/[roomId]/page.tsx`

Server component. Calls `getAccessibleProject` and branches on the result.

```tsx
import { getAccessibleProject } from "@/lib/project-access";
import { AccessDenied } from "@/components/editor/access-denied";
import { EditorWorkspaceClient } from "@/components/editor/editor-workspace-client";

interface Props {
  params: Promise<{ roomId: string }>;
}

export default async function EditorWorkspacePage({ params }: Props) {
  const { roomId } = await params;
  const project = await getAccessibleProject(roomId);

  if (!project) {
    return <AccessDenied />;
  }

  return <EditorWorkspaceClient project={project} />;
}
```

- `params` is typed as `Promise<{ roomId: string }>` — required by Next.js 16.
- No `redirect()` on unauthorized — `<AccessDenied>` renders in-place with a link back to `/editor`.
- No `notFound()` call — unknown IDs and access-denied cases both surface the same `<AccessDenied>` UI to avoid leaking project existence.
- The server component does not import any client-only code directly; `EditorWorkspaceClient` is the client boundary.

---

## Acceptance

- [ ] Navigating to `/editor/[roomId]` for an owned project renders `<EditorWorkspaceClient>` with the project name in the header
- [ ] Navigating to `/editor/unknown-id` renders `<AccessDenied>`
- [ ] Navigating to a valid project ID owned by a different user renders `<AccessDenied>` (access denied, not just missing)
- [ ] `getAccessibleProject` returns `null` when the user is unauthenticated
- [ ] `getAccessibleProject` returns `null` when `roomId` does not exist in the database
- [ ] `getAccessibleProject` returns the `Project` row when the caller is the owner
- [ ] `userHasProjectAccess` returns `true` for owners and `false` for non-members
- [ ] `<AccessDenied>` renders the `ShieldOff` icon, the message text, and a "Back to projects" link pointing to `/editor`
- [ ] `<EditorWorkspaceClient>` is marked `"use client"` and accepts a `Project` prop typed from `@prisma/client`
- [ ] `app/editor/[roomId]/page.tsx` `params` is typed as `Promise<{ roomId: string }>`
- [ ] No raw Tailwind color classes (`zinc-*`, etc.) in any new file — only design token utilities
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
