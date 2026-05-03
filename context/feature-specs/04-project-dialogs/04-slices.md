# Feature 04 — Project Dialogs: Slices

## Sliced Breadboard

```mermaid
flowchart TB
    subgraph workspace["PLACE: Editor Workspace /editor/[roomId]"]
        subgraph navbarComp["EditorNavbar"]
            U1["U1: Sidebar toggle (existing)"]
        end

        subgraph sidebarComp["EditorSidebar"]
            U2["U2: Sidebar panel (existing)"]

            subgraph slice1["V1: RENAME ACTION"]
                U3["U3: Rename button"]
            end

            subgraph slice2["V2: DELETE ACTION"]
                U4["U4: Delete button"]
            end

            subgraph slice3["V3: MOBILE SIDEBAR"]
                U7["U7: Backdrop scrim"]
            end
        end

        subgraph slice1d["V1: RENAME ACTION"]
            U5["U5: Rename dialog"]
            N1r["N1: hook (rename state)"]
            N4["N4: isOwner check"]
        end

        subgraph slice2d["V2: DELETE ACTION"]
            U6["U6: Delete dialog"]
            N1d["N1: hook (delete state)"]
        end
    end

    subgraph apiLayer["PLACE: API Routes"]
        subgraph slice1a["V1: RENAME ACTION"]
            N2["N2: PATCH /api/projects/[id]"]
        end
        subgraph slice2a["V2: DELETE ACTION"]
            N3["N3: DELETE /api/projects/[id]"]
        end
    end

    %% Existing wiring
    U1 -->|toggle| U2

    %% V1 wiring
    N4 -->|gates| U3
    U3 -->|openRename| N1r
    N1r -->|dialog=rename| U5
    U5 -->|submit| N2
    N2 -.->|name updated| U2

    %% V2 wiring
    N4 -->|gates| U4
    U4 -->|openDelete| N1d
    N1d -->|dialog=delete| U6
    U6 -->|confirm| N3
    N3 -.->|deleted → redirect /editor| workspace

    %% V3 wiring
    U7 -->|tap outside| U2

    %% Slice ordering
    slice1 ~~~ slice2
    slice2 ~~~ slice3

    %% Slice colors
    style slice1  fill:#e8f5e9,stroke:#4caf50,stroke-width:2px
    style slice1d fill:#e8f5e9,stroke:#4caf50,stroke-width:2px
    style slice1a fill:#e8f5e9,stroke:#4caf50,stroke-width:2px
    style slice2  fill:#e3f2fd,stroke:#2196f3,stroke-width:2px
    style slice2d fill:#e3f2fd,stroke:#2196f3,stroke-width:2px
    style slice2a fill:#e3f2fd,stroke:#2196f3,stroke-width:2px
    style slice3  fill:#fff3e0,stroke:#ff9800,stroke-width:2px

    classDef ui fill:#ffb6c1,stroke:#d87093,color:#000
    classDef nonui fill:#d3d3d3,stroke:#808080,color:#000
    class U1,U2,U3,U4,U5,U6,U7 ui
    class N1r,N1d,N2,N3,N4 nonui
```

---

## Slices Grid

|  |  |  |
|:--|:--|:--|
| **V1: RENAME ACTION**<br>⏳ PENDING<br><br>• `isOwner`: `project.ownerId === userId`<br>• Rename button in sidebar header<br>• `useProjectActions` hook (rename)<br>• Rename dialog — prefilled, auto-focus, Enter submits<br>• PATCH `/api/projects/[id]`<br>• Local `projectName` state update<br><br>*Demo: Own project → rename button visible → dialog opens → submit → sidebar name updates* | **V2: DELETE ACTION**<br>⏳ PENDING<br><br>• Delete button in sidebar header<br>• `useProjectActions` hook (delete)<br>• Delete dialog — destructive confirm<br>• DELETE `/api/projects/[id]`<br>• Redirect to `/editor` on success<br>• &nbsp;<br><br>*Demo: Own project → delete button → confirm → redirected to home* | **V3: MOBILE SIDEBAR**<br>⏳ PENDING<br><br>• Backdrop scrim div (fixed, full-viewport)<br>• Tap-outside closes sidebar<br>• Scrim only renders when sidebar is open<br>• &nbsp;<br>• &nbsp;<br>• &nbsp;<br><br>*Demo: Narrow viewport → sidebar open → tap outside → sidebar closes* |

---

## V1 Slice Detail

### Goal
Rename action end-to-end: button in sidebar → dialog → PATCH API → name updates in place.

### Affordances

| ID | Affordance | File |
|----|-----------|------|
| N4 | `isOwner` computed server-side, passed as prop | `app/editor/[roomId]/page.tsx` |
| U3 | Rename button in sidebar project header (hidden when `!isOwner`) | `components/editor/editor-sidebar.tsx` |
| N1 | `useProjectActions` hook — `dialog`, `name`, `loading`, `open/close` | `hooks/use-project-actions.ts` (new) |
| U5 | Rename dialog — prefilled input, `onOpenAutoFocus` focuses ref, Enter submits | `components/editor/editor-workspace-client.tsx` |
| N2 | PATCH `/api/projects/[id]` — already exists from Feature 03 | `app/api/projects/[id]/route.ts` |
| — | `projectName` local state initialized from `project.name` server prop | `components/editor/editor-workspace-client.tsx` |

### Key implementation notes
- `isOwner`: `auth()` is already called in `getCurrentProjectIdentity`. In `page.tsx`, run `getAccessibleProject` and `getCurrentProjectIdentity` in parallel via `Promise.all`. Compare `project.ownerId === identity.userId`.
- Auto-focus: `<DialogContent onOpenAutoFocus={(e) => { e.preventDefault(); inputRef.current?.focus(); }}>` — from spike.
- After PATCH success: `setProjectName(updated.name)` — no `router.refresh()` (soft-nav state loss issue from spike).
- Pass `projectName` and `onRename` down from `EditorWorkspaceClient` to `EditorSidebar` so the header reflects the updated name.

---

## V2 Slice Detail

### Goal
Delete action end-to-end: button in sidebar → confirm dialog → DELETE API → redirect to `/editor`.

### Affordances

| ID | Affordance | File |
|----|-----------|------|
| U4 | Delete button in sidebar project header (hidden when `!isOwner`) | `components/editor/editor-sidebar.tsx` |
| N1 | Extend `useProjectActions` hook with `openDelete`, `closeDelete` | `hooks/use-project-actions.ts` |
| U6 | Delete dialog — destructive confirm button, no input | `components/editor/editor-workspace-client.tsx` |
| N3 | DELETE `/api/projects/[id]` — already exists from Feature 03 | `app/api/projects/[id]/route.ts` |
| — | `router.push('/editor')` after successful delete | `components/editor/editor-workspace-client.tsx` |

### Key implementation notes
- Reuse `isOwner` prop already threaded in V1 — no additional server changes.
- Loading state in hook prevents double-submit on confirm.
- Delete button uses `variant="destructive"` from shadcn Button.

---

## V3 Slice Detail

### Goal
Mobile sidebar closes when user taps the backdrop scrim behind it.

### Affordances

| ID | Affordance | File |
|----|-----------|------|
| U7 | Backdrop `div` — `fixed inset-0 z-10 bg-black/40` — rendered when sidebar is open | `components/editor/editor-workspace-client.tsx` |
| — | `onClick` on backdrop calls `setSidebarOpen(false)` | `components/editor/editor-workspace-client.tsx` |

### Key implementation notes
- Sidebar sits at `z-20`, backdrop at `z-10`, canvas at default z.
- Backdrop renders unconditionally on mobile when sidebar is open — no media query JS needed. Use Tailwind's `md:hidden` to suppress on desktop.
- No new components needed — two lines added to `EditorWorkspaceClient`.
