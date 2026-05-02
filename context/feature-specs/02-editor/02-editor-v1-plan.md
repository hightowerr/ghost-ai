# V1: Navbar Shell — Implementation Plan

**Feature:** 02 Editor Chrome
**Slice:** V1 of 2
**Status:** ✅ COMPLETE

---

## Goal

Create `components/editor/editor-navbar.tsx`. The sidebar does not exist yet — the toggle button renders with a stub `isOpen` boolean managed in the parent. Everything visible in the navbar is complete and correctly styled.

**Demo:** Navbar renders across the top of the editor page. Dark background, subtle bottom border. Toggle button switches between PanelLeftOpen and PanelLeftClose on click.

---

## Affordances in This Slice

| ID | Affordance |
|----|-----------|
| U1 | Sidebar toggle button (PanelLeftOpen / PanelLeftClose — stub state) |
| N1-stub | `isSidebarOpen` boolean state in parent (default `false`) |

---

## Files

| Action | File |
|--------|------|
| Create | `components/editor/editor-navbar.tsx` |
| Update | Editor page — add navbar with stub state |

---

## Implementation

### `components/editor/editor-navbar.tsx`

```tsx
"use client";

import { PanelLeftOpen, PanelLeftClose } from "lucide-react";

interface EditorNavbarProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function EditorNavbar({ isSidebarOpen, onToggleSidebar }: EditorNavbarProps) {
  return (
    <header className="h-12 flex items-center px-3 bg-surface border-b border-default shrink-0">
      {/* Left */}
      <div className="flex items-center">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded-xl text-copy-muted hover:text-copy-primary hover:bg-bg-subtle transition-colors"
          aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
        >
          {isSidebarOpen ? (
            <PanelLeftClose className="h-5 w-5" />
          ) : (
            <PanelLeftOpen className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Center */}
      <div className="flex-1" />

      {/* Right */}
      <div className="flex items-center" />
    </header>
  );
}
```

### Editor page update

Add `isOpen` stub state and render `EditorNavbar`:

```tsx
const [isSidebarOpen, setIsSidebarOpen] = useState(false);

<EditorNavbar
  isSidebarOpen={isSidebarOpen}
  onToggleSidebar={() => setIsSidebarOpen((v) => !v)}
/>
```

---

## Acceptance

- [ ] Navbar renders at the top of the editor page
- [ ] Fixed height, dark background, subtle bottom border visible
- [ ] Toggle button shows PanelLeftOpen when `isSidebarOpen = false`
- [ ] Toggle button shows PanelLeftClose when `isSidebarOpen = true`
- [ ] Clicking toggle switches the icon
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
