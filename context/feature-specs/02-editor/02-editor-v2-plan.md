# V2: Sidebar + Full Wiring — Implementation Plan

**Feature:** 02 Editor Chrome
**Slice:** V2 of 2
**Status:** ✅ COMPLETE

---

## Goal

Create `components/editor/project-sidebar.tsx` and wire the full toggle interaction. The navbar toggle now drives real sidebar visibility. Tabs, close button, and New Project button are in place. Dialog pattern verified.

**Demo:** Click navbar toggle → sidebar slides in from the left. Click X or toggle again → sidebar slides out. My Projects and Shared tabs are switchable. Dialog renders correctly with title, description, and footer.

---

## Affordances in This Slice

| ID | Affordance |
|----|-----------|
| U1 | Sidebar toggle (wired — icon now reflects real sidebar state) |
| U2 | Close button (X) in sidebar header |
| U3 | "My Projects" tab trigger |
| U4 | "Shared" tab trigger |
| U5 | Empty placeholder content in both tab panels |
| U6 | "New Project" button with Plus icon (deferred action) |
| N1 | `onToggleSidebar()` — toggles `isOpen` in parent |
| N2 | `onClose()` — sets `isOpen = false` in parent |
| N3 | `dialog.tsx` — verified: title / description / footer pattern works |

---

## Files

| Action | File |
|--------|------|
| Create | `components/editor/project-sidebar.tsx` |
| Update | Editor page — replace stub with real wiring |
| Verify | `components/ui/dialog.tsx` |

---

## Implementation

### `components/editor/project-sidebar.tsx`

```tsx
"use client";

import { X, Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ProjectSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProjectSidebar({ isOpen, onClose }: ProjectSidebarProps) {
  return (
    <aside
      className={[
        "fixed inset-y-0 left-0 z-50 w-64 flex flex-col",
        "bg-surface border-r border-default",
        "transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full",
      ].join(" ")}
    >
      {/* Header */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-default shrink-0">
        <span className="text-sm font-medium text-copy-primary">Projects</span>
        <button
          onClick={onClose}
          className="p-1.5 rounded-xl text-copy-muted hover:text-copy-primary hover:bg-bg-subtle transition-colors"
          aria-label="Close sidebar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="my-projects" className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-full rounded-none border-b border-default bg-transparent px-2 pt-2">
          <TabsTrigger value="my-projects" className="flex-1 text-xs">
            My Projects
          </TabsTrigger>
          <TabsTrigger value="shared" className="flex-1 text-xs">
            Shared
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-projects" className="flex-1 flex items-center justify-center p-4">
          <p className="text-xs text-copy-muted text-center">No projects yet</p>
        </TabsContent>

        <TabsContent value="shared" className="flex-1 flex items-center justify-center p-4">
          <p className="text-xs text-copy-muted text-center">No shared projects</p>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="p-3 border-t border-default shrink-0">
        <button className="w-full flex items-center justify-center gap-2 h-9 rounded-xl bg-bg-subtle hover:bg-bg-elevated text-sm text-copy-primary transition-colors">
          <Plus className="h-4 w-4" />
          New Project
        </button>
      </div>
    </aside>
  );
}
```

### Editor page — replace stub wiring

```tsx
// Same isOpen state, now passed to ProjectSidebar
<EditorNavbar
  isSidebarOpen={isSidebarOpen}
  onToggleSidebar={() => setIsSidebarOpen((v) => !v)}
/>

<ProjectSidebar
  isOpen={isSidebarOpen}
  onClose={() => setIsSidebarOpen(false)}
/>
```

### Dialog verification

Confirm `components/ui/dialog.tsx` renders title, description, and footer:

```tsx
// Smoke-test — does not need to be shipped, just verify the pattern works:
<Dialog>
  <DialogTrigger>Open</DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
      <DialogDescription>Description text.</DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

No changes to `dialog.tsx` are expected. Confirm it compiles and uses globals.css tokens.

---

## Acceptance

- [ ] Sidebar slides in from the left when `isOpen = true`
- [ ] Sidebar slides out when `isOpen = false`
- [ ] Transition is smooth (translate-x, 300ms)
- [ ] Sidebar floats above the canvas — no layout shift
- [ ] Header shows "Projects" and an X close button
- [ ] Clicking X closes the sidebar
- [ ] My Projects and Shared tabs are present and switchable
- [ ] Both tab panels show an empty placeholder message
- [ ] New Project button with Plus icon visible at the bottom
- [ ] Navbar toggle icon switches correctly (PanelLeftOpen ↔ PanelLeftClose)
- [ ] `dialog.tsx` renders title, description, and footer without modification
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
