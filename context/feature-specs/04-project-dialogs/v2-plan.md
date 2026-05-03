# V2: Delete Action — Implementation Plan

## Goal

Deliver the delete action end-to-end: a delete button visible in the sidebar project header (owner only) opens a destructive confirm dialog with no text input. Confirming calls `DELETE /api/projects/[projectId]` and redirects the user to `/editor` on success. The loading guard prevents duplicate requests.

## Depends on

V1 complete. Before starting V2, the following must already exist:

- `isOwner` prop threaded from `page.tsx` → `EditorWorkspaceClient` → `EditorSidebar`
- `hooks/use-project-actions.ts` exists with `dialog: 'rename' | 'delete' | null`, `loading: boolean`, and rename-related open/close methods
- `projectName` local state and rename dialog are working in `EditorWorkspaceClient`

## Files

| Action | File |
|--------|------|
| Modify | `hooks/use-project-actions.ts` |
| Modify | `components/editor/editor-sidebar.tsx` |
| Modify | `components/editor/editor-workspace-client.tsx` |

No new files. No changes to `app/editor/[roomId]/page.tsx` or the API route — both are already correct from V1 and Feature 03 respectively.

---

## Steps

### Step 1 — Extend `useProjectActions` with delete methods

File: `hooks/use-project-actions.ts`

V1 created this hook with `openRename()` and `closeRename()`. V2 adds `openDelete()` and `closeDelete()`. The simplest approach is a unified `open(type: 'rename' | 'delete')` dispatcher, but if V1 used individual named methods, keep the same pattern for consistency.

Add the following to the hook's returned interface:

```ts
openDelete: () => void;
closeDelete: () => void;
handleDelete: (projectId: string) => Promise<void>;
```

The `handleDelete` implementation must:

1. Guard against double-submit: return early if `loading === true` before setting state.
2. Set `loading = true`.
3. Call `fetch(\`/api/projects/\${projectId}\`, { method: 'DELETE' })`.
4. On non-ok response, set `loading = false` and return (do NOT navigate — let the dialog stay open so the user sees the failure).
5. On success (`response.status === 204`), set `dialog = null` and call the `onDeleted` callback passed into the hook (the callback will fire `router.push('/editor')`).
6. The `loading` flag is reset inside the callback path for success, and explicitly reset in the error path.

Hook signature after V2:

```ts
interface UseProjectActionsOptions {
  onDeleted: () => void;   // called after successful delete
}

interface UseProjectActionsReturn {
  dialog: 'rename' | 'delete' | null;
  name: string;            // rename input value (V1)
  loading: boolean;
  setName: (v: string) => void;
  openRename: () => void;
  closeRename: () => void;
  handleRename: (projectId: string, currentName: string) => Promise<void>;
  openDelete: () => void;
  closeDelete: () => void;
  handleDelete: (projectId: string) => Promise<void>;
}
```

`openDelete` sets `dialog = 'delete'`. `closeDelete` sets `dialog = null`. Neither touches `loading`.

The `onDeleted` callback is injected at call-site in `EditorWorkspaceClient` as `() => router.push('/editor')`. The hook itself never imports `useRouter` — navigation is the caller's concern.

Full `handleDelete` shape:

```ts
const handleDelete = async (projectId: string) => {
  if (loading) return;
  setLoading(true);
  try {
    const res = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
    if (!res.ok) {
      setLoading(false);
      return;
    }
    setDialog(null);
    setLoading(false);
    onDeleted();
  } catch {
    setLoading(false);
  }
};
```

Note: the `try/catch` catches network failures (fetch rejects). A non-2xx HTTP status does not throw — handle it via `res.ok`.

---

### Step 2 — Add the delete button to `EditorSidebar`

File: `components/editor/editor-sidebar.tsx`

V1 already added `isOwner` and `onRename` props plus the rename button. V2 adds `onDelete` to the props interface and renders the delete button alongside the rename button in the project header section.

Extend the props interface:

```ts
interface EditorSidebarProps {
  projectName: string;
  isOwner: boolean;
  onRename: () => void;
  onDelete: () => void;   // NEW in V2
}
```

In the project header block (the `<div>` containing `<p className="... truncate">{projectName}</p>`), render the delete button conditionally alongside the rename button:

```tsx
{isOwner && (
  <div className="flex items-center gap-1">
    <button
      onClick={onRename}
      className="p-1 rounded text-copy-muted hover:text-copy-secondary hover:bg-elevated transition-colors"
      aria-label="Rename project"
    >
      <Pencil className="h-3 w-3" />
    </button>
    <button
      onClick={onDelete}
      className="p-1 rounded text-copy-muted hover:text-state-error hover:bg-elevated transition-colors"
      aria-label="Delete project"
    >
      <Trash2 className="h-3 w-3" />
    </button>
  </div>
)}
```

Import `Trash2` from `lucide-react` (add alongside the existing `Pencil` import added in V1). Use `text-state-error` on hover for the delete button to signal the destructive intent — this follows the CSS token conventions from `code-standards.md` (no raw Tailwind color classes).

The project header layout should be a flex row (`flex items-center justify-between`) so the project name and action buttons sit on the same line without wrapping.

---

### Step 3 — Wire the delete button in `EditorWorkspaceClient`

File: `components/editor/editor-workspace-client.tsx`

**3a. Pass `onDelete` into `EditorSidebar`**

The hook is already instantiated in V1. Extend the call-site to also pass `onDelete`:

```tsx
const actions = useProjectActions({ onDeleted: () => router.push('/editor') });
```

Pass to `EditorSidebar`:

```tsx
<EditorSidebar
  projectName={projectName}
  isOwner={isOwner}
  onRename={actions.openRename}
  onDelete={actions.openDelete}    {/* NEW */}
/>
```

`useRouter` must already be imported from `next/navigation` (it was needed in V1 for post-rename flow, or can be added now if V1 used a different approach). If not already present, add:

```ts
import { useRouter } from 'next/navigation';
const router = useRouter();
```

**3b. Render the delete dialog**

Place the delete dialog in `EditorWorkspaceClient` alongside the rename dialog (both are rendered at the component's top level, outside `<main>`). The dialog is controlled via `actions.dialog === 'delete'`:

```tsx
<Dialog
  open={actions.dialog === 'delete'}
  onOpenChange={(open) => { if (!open) actions.closeDelete(); }}
>
  <DialogContent showCloseButton={false} className="bg-surface border-surface-border rounded-3xl sm:max-w-md">
    <DialogHeader>
      <DialogTitle className="text-copy-primary">Delete project?</DialogTitle>
      <DialogDescription className="text-copy-secondary">
        <strong className="text-copy-primary">{projectName}</strong> will be permanently
        deleted. This action cannot be undone.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button
        variant="outline"
        onClick={actions.closeDelete}
        disabled={actions.loading}
      >
        Cancel
      </Button>
      <Button
        variant="destructive"
        onClick={() => actions.handleDelete(project.id)}
        disabled={actions.loading}
      >
        {actions.loading ? 'Deleting…' : 'Delete'}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

Key details:

- `showCloseButton={false}` — the X close button is suppressed. The only dismiss paths are "Cancel" and clicking the overlay (Radix handles the overlay click via `onOpenChange`). Do not close on overlay click while `loading === true` — set `onOpenChange` to guard: `if (!open && !actions.loading) actions.closeDelete()`.
- `rounded-3xl` on `DialogContent` matches the modal border-radius convention from `code-standards.md`.
- No `<input>` — the delete dialog is description + two buttons only.
- Confirm button is `variant="destructive"`, disabled while `actions.loading`.
- Cancel button is `variant="outline"`, also disabled while `actions.loading` to prevent the user from half-abandoning a request in flight.
- The `projectName` in the description uses the local state string from V1 (not `project.name` directly), so it reflects any rename that happened in the same session.

**3c. Confirm `useProjectActions` is initialised with the onDeleted callback**

The hook options must include the navigation callback:

```ts
const actions = useProjectActions({
  onDeleted: () => router.push('/editor'),
});
```

If V1 initialised the hook without options (because it only needed rename), refactor the hook to accept the options object and keep the `onDeleted` callback optional with a no-op default. That way V1's rename tests are not broken.

---

### Step 4 — Type-check and lint

```bash
npx tsc --noEmit
pnpm lint
```

Resolve any errors before marking the slice done. Common pitfalls:

- `Trash2` not imported from `lucide-react` in `editor-sidebar.tsx`
- `onDelete` prop missing from the `EditorSidebarProps` interface
- `handleDelete` not exported from `use-project-actions.ts`
- `useRouter` not imported in `editor-workspace-client.tsx`

---

## API contract (for reference — do not modify)

`DELETE /api/projects/[projectId]`

- Auth: requires a valid Clerk session (`getCurrentProjectIdentity`).
- Ownership: checks `existing.ownerId === identity.userId`, returns `403` if not owner.
- Success: `204 No Content` with empty body.
- The route param is `projectId` (not `id` or `roomId`). The project's `id` field is the same as the `roomId` in the editor URL. Pass `project.id` from the prop.

---

## Testing

### Automated

```bash
npx tsc --noEmit
pnpm lint
```

Both must exit clean with zero errors or warnings.

### Manual — setup

Have two Clerk accounts available: one that owns a test project (owner), one that has been added as a collaborator (non-owner). Open the editor workspace for the test project in each account.

### Manual — checklist

| # | Scenario | Expected |
|---|----------|----------|
| 1 | Signed in as owner — sidebar project header | Delete button (trash icon) is visible next to the rename button |
| 2 | Signed in as collaborator (non-owner) — sidebar project header | Delete button is NOT rendered |
| 3 | Owner: click the delete button | Delete dialog opens. Dialog contains the project name in the description text. No input field is present. |
| 4 | Dialog open: click Cancel | Dialog closes. User remains in the editor workspace. No API call is made. Project is unchanged. |
| 5 | Dialog open: click overlay (outside dialog area) | Dialog closes. User remains in the editor workspace. No API call is made. |
| 6 | Dialog open: click Delete | Confirm button changes to "Deleting…" and becomes disabled. Cancel button also becomes disabled. |
| 7 | After clicking Delete (success path) | User is redirected to `/editor`. |
| 8 | After redirect | The deleted project no longer appears in the editor home project list. |
| 9 | Double-click Delete rapidly | Only one `DELETE` request fires. The loading guard (`if (loading) return`) absorbs the second click. Verify in Network tab: exactly one request with status 204. |
| 10 | Non-owner attempts DELETE via curl | API returns `403 Forbidden`. (Ensures server-side ownership is enforced independently of the UI gate.) |

### Manual — edge cases

- Delete while the rename dialog is still animating closed: should not be possible because both dialogs are mutually exclusive via `dialog` state in the hook (`dialog` can only be one value at a time).
- Reload the editor home page after delete and confirm the project entry is gone from the list (checks the database delete, not just client state).
