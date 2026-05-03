# V1: Rename Action — Implementation Plan

## Goal

Deliver the rename action end-to-end: a Rename button appears in the sidebar project header for project owners only. Clicking it opens a dialog prefilled with the current project name. Submitting sends a PATCH to the existing API route. On success, the sidebar header reflects the new name immediately via local state — no page refresh.

---

## Prerequisite: Field name correction

The Prisma `Project` model uses `ownerId` (not `userId`). Every ownership check in this slice must compare `project.ownerId === userId`. Do not introduce a `userId` field.

---

## Files

| Action | File |
|--------|------|
| Modify | `app/editor/[roomId]/page.tsx` |
| Create | `hooks/use-project-actions.ts` |
| Modify | `components/editor/editor-workspace-client.tsx` |
| Modify | `components/editor/editor-sidebar.tsx` |
| No change | `app/api/projects/[projectId]/route.ts` |
| No change | `lib/project-access.ts` |

---

## Steps

### Step 1 — Thread `isOwner` from the server page (N4)

File: `app/editor/[roomId]/page.tsx`

The page already calls `getAccessibleProject(roomId)` which internally calls `auth()`. To avoid a second round-trip, call `getCurrentProjectIdentity()` (imported from `@/lib/project-access`) alongside it. Both are async — run them in parallel with `Promise.all`.

```ts
import { getAccessibleProject, getCurrentProjectIdentity } from "@/lib/project-access";
import { AccessDenied } from "@/components/editor/access-denied";
import { EditorWorkspaceClient } from "@/components/editor/editor-workspace-client";

interface Props {
  params: Promise<{ roomId: string }>;
}

export default async function EditorWorkspacePage({ params }: Props) {
  const { roomId } = await params;

  const [project, identity] = await Promise.all([
    getAccessibleProject(roomId),
    getCurrentProjectIdentity().catch(() => null),
  ]);

  if (!project) return <AccessDenied />;

  const isOwner = identity ? project.ownerId === identity.userId : false;

  return <EditorWorkspaceClient project={project} isOwner={isOwner} />;
}
```

Note: `getCurrentProjectIdentity()` throws if unauthenticated — catch it and default `isOwner` to `false`. `getAccessibleProject` already guards the unauthenticated case by returning `null`.

---

### Step 2 — Create the `useProjectActions` hook (N1)

File: `hooks/use-project-actions.ts` (new file)

This hook owns all dialog state for project actions. V1 only uses `'rename'`. The `dialog` discriminant is typed to include `'delete'` now so V2 can extend this hook without changing call sites.

```ts
"use client";

import { useCallback, useState } from "react";

export type ProjectDialog = "rename" | "delete" | null;

interface ProjectActionsState {
  dialog: ProjectDialog;
  name: string;
  loading: boolean;
}

interface UseProjectActionsReturn extends ProjectActionsState {
  openRename: (currentName: string) => void;
  closeDialog: () => void;
  setName: (name: string) => void;
  setLoading: (loading: boolean) => void;
}

export function useProjectActions(): UseProjectActionsReturn {
  const [state, setState] = useState<ProjectActionsState>({
    dialog: null,
    name: "",
    loading: false,
  });

  const openRename = useCallback((currentName: string) => {
    setState({ dialog: "rename", name: currentName, loading: false });
  }, []);

  const closeDialog = useCallback(() => {
    setState((prev) => ({ ...prev, dialog: null, loading: false }));
  }, []);

  const setName = useCallback((name: string) => {
    setState((prev) => ({ ...prev, name }));
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setState((prev) => ({ ...prev, loading }));
  }, []);

  return { ...state, openRename, closeDialog, setName, setLoading };
}
```

Design notes:
- `openRename` accepts `currentName` so the input is prefilled from wherever the call originates.
- `closeDialog` resets `loading` so a partially-failed attempt doesn't lock the dialog on re-open.
- V2 adds `openDelete` alongside `openRename` — no structural changes needed.

---

### Step 3 — Add `isOwner` prop and local `projectName` state to `EditorWorkspaceClient`; wire the Rename dialog (U5)

File: `components/editor/editor-workspace-client.tsx`

**3a. Extend the props interface.**

```ts
interface EditorWorkspaceClientProps {
  project: Project;
  isOwner: boolean;
}
```

**3b. Add `projectName` local state and the `useProjectActions` hook.**

```ts
const [projectName, setProjectName] = useState(project.name);
const actions = useProjectActions();
const inputRef = useRef<HTMLInputElement>(null);
```

`projectName` is the single source of truth for the displayed name after the page loads. It is initialized from the server prop `project.name` and mutated only on successful PATCH.

**3c. Implement the `handleRename` submit handler.**

The API route lives at `/api/projects/[projectId]` — the segment param is `projectId`, matching the file `app/api/projects/[projectId]/route.ts`. The project's `id` field is used as the path segment.

```ts
async function handleRename() {
  const trimmed = actions.name.trim();
  if (!trimmed || trimmed === projectName) {
    actions.closeDialog();
    return;
  }

  actions.setLoading(true);
  try {
    const res = await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });

    if (!res.ok) {
      // Non-throwing failure: leave dialog open, clear loading
      actions.setLoading(false);
      return;
    }

    const updated: Project = await res.json();
    setProjectName(updated.name);
    actions.closeDialog();
  } catch {
    actions.setLoading(false);
  }
}
```

Do NOT call `router.refresh()` after a successful rename. It triggers soft-nav state loss in Next.js App Router. Local state update via `setProjectName` is sufficient.

**3d. Pass `projectName`, `isOwner`, and `onRename` down to `EditorSidebar`.**

```tsx
{sidebarOpen && (
  <EditorSidebar
    projectName={projectName}
    isOwner={isOwner}
    onRename={() => actions.openRename(projectName)}
  />
)}
```

**3e. Render the Rename dialog.**

Place the `<Dialog>` outside `<main>` but inside the outermost `<div>` so it is always in the React tree regardless of sidebar state.

```tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Inside the JSX return, after </main>:
<Dialog open={actions.dialog === "rename"} onOpenChange={(open) => { if (!open) actions.closeDialog(); }}>
  <DialogContent
    className="sm:max-w-md bg-surface border-surface-border rounded-3xl"
    onOpenAutoFocus={(e) => {
      e.preventDefault();
      inputRef.current?.focus();
    }}
  >
    <DialogHeader>
      <DialogTitle className="text-copy-primary">Rename project</DialogTitle>
    </DialogHeader>

    <Input
      ref={inputRef}
      value={actions.name}
      onChange={(e) => actions.setName(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          handleRename();
        }
      }}
      placeholder="Project name"
      className="bg-elevated border-surface-border text-copy-primary"
      disabled={actions.loading}
    />

    <DialogFooter showCloseButton>
      <Button
        onClick={handleRename}
        disabled={actions.loading || !actions.name.trim()}
      >
        {actions.loading ? "Saving…" : "Save"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

Auto-focus pattern: `onOpenAutoFocus` fires after Radix animates the dialog open. Call `e.preventDefault()` first (suppresses Radix's default focus trap behavior on the first focusable element), then manually call `inputRef.current?.focus()`. Do not use the bare `autoFocus` attribute — it fires too early in the render cycle and loses focus to the animation.

Border-radius: per code standards, modals use `rounded-3xl`.

---

### Step 4 — Add `isOwner` and `onRename` props to `EditorSidebar`; render the Rename button (U3)

File: `components/editor/editor-sidebar.tsx`

**4a. Extend the props interface.**

```ts
interface EditorSidebarProps {
  projectName: string;
  isOwner: boolean;
  onRename: () => void;
}
```

**4b. Add the Rename button to the project header section.**

The Rename button sits beside the project name in the existing `border-b` section. It is only rendered when `isOwner` is `true`. Use `Pencil` from lucide-react.

```tsx
import { Pencil, ArrowLeft, ChevronRight, /* ... existing */ } from "lucide-react";

// In the project name section:
<div className="px-3 pb-3 border-b border-surface-border flex items-center justify-between gap-2">
  <p className="text-sm font-semibold text-copy-primary truncate">{projectName}</p>
  {isOwner && (
    <button
      onClick={onRename}
      className="shrink-0 p-1 rounded-lg text-copy-muted hover:text-copy-secondary hover:bg-elevated transition-colors"
      aria-label="Rename project"
    >
      <Pencil className="h-3.5 w-3.5" />
    </button>
  )}
</div>
```

The button uses a small icon (`h-3.5 w-3.5`) so it doesn't crowd the truncated name. `shrink-0` prevents it from collapsing when the name is long.

---

### Step 5 — Verify no change needed to the API route

File: `app/api/projects/[projectId]/route.ts`

The PATCH handler already:
- Authenticates via `getCurrentProjectIdentity()`
- Verifies `existing.ownerId === identity.userId` before mutating
- Accepts `{ name: string }` in the request body
- Returns the full updated `Project` object as JSON

No changes required. The client calls this as `PATCH /api/projects/${project.id}`.

---

### Step 6 — Verify imports and type-check

Ensure these imports are present in `editor-workspace-client.tsx`:

```ts
import { useState, useRef } from "react";
import { useProjectActions } from "@/hooks/use-project-actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
```

Verify `Input` exists in `components/ui/input.tsx`. If it does not exist (not yet installed via shadcn), install it first:

```bash
pnpm dlx shadcn@latest add input
```

---

## Complete data-flow summary

```
page.tsx (server)
  ├── getAccessibleProject(roomId)      → project (with ownerId)
  ├── getCurrentProjectIdentity()       → identity (with userId)
  ├── isOwner = project.ownerId === identity.userId
  └── <EditorWorkspaceClient project={project} isOwner={isOwner} />

EditorWorkspaceClient (client)
  ├── useState(project.name) → projectName / setProjectName
  ├── useProjectActions()    → actions { dialog, name, loading, openRename, closeDialog, ... }
  ├── useRef<HTMLInputElement>() → inputRef
  ├── <EditorSidebar projectName={projectName} isOwner={isOwner} onRename={() => actions.openRename(projectName)} />
  └── <Dialog open={actions.dialog === 'rename'}>
        <DialogContent onOpenAutoFocus={e => { e.preventDefault(); inputRef.current?.focus(); }}>
          <Input ref={inputRef} value={actions.name} onChange={...} onKeyDown={Enter → handleRename} />
          <DialogFooter><Button onClick={handleRename}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

handleRename()
  └── PATCH /api/projects/${project.id}  { name: actions.name.trim() }
        ├── ok  → setProjectName(updated.name); actions.closeDialog()
        └── err → actions.setLoading(false)  [dialog stays open]

EditorSidebar (client)
  └── {isOwner && <button onClick={onRename}><Pencil /></button>}
      projectName prop controls displayed name — reflects setProjectName update
```

---

## Testing

### Automated checks

Run these before marking the slice done:

```bash
# Type-check — must pass with zero errors
npx tsc --noEmit

# Lint — must pass with zero warnings/errors
pnpm lint
```

### Manual verification

All steps below assume a local dev server (`pnpm dev`) running against a seeded database with at least one owned project and one shared (collaborator-only) project.

| # | Step | Expected result |
|---|------|-----------------|
| 1 | Visit a project you own (`/editor/[roomId]`) | Sidebar project header shows the project name **and** a small pencil icon button |
| 2 | Visit a project you are a collaborator on (not owner) | Sidebar project header shows the project name only — no pencil icon |
| 3 | On an owned project, click the pencil icon | Rename dialog opens |
| 4 | Inspect the dialog input immediately on open | Input is focused (cursor visible) without any manual click |
| 5 | Inspect the input value on open | Input is prefilled with the current project name |
| 6 | Clear the input and type a new name; press Enter | Dialog closes; sidebar header immediately shows the new name |
| 7 | Repeat step 6 but click the Save button instead of pressing Enter | Same result — dialog closes and name updates |
| 8 | Open rename dialog; press Escape or click the X button without submitting | Dialog closes; sidebar header still shows the original name |
| 9 | Open rename dialog; submit the same name as currently shown | Dialog closes silently (no fetch issued, name unchanged) |
| 10 | Reload the page after a rename | Page reloads with the updated name from the database (confirms PATCH persisted) |
| 11 | Open rename dialog; simulate API error (e.g. temporarily break the route); submit | Dialog stays open; Save button re-enables (loading clears) |
