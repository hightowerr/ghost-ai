# 02 Editor Chrome — Slices

**Selected shape:** A (Props-Controlled Floating Chrome)

---

## Slices Overview

| Slice | Name | Demo |
|-------|------|------|
| V1 | Navbar Shell | Navbar renders on editor page; toggle button present with PanelLeftOpen icon |
| V2 | Sidebar + Full Wiring | Toggle opens sidebar (slides in); X closes it; My Projects/Shared tabs switch; dialog confirmed |

---

## V1: Navbar Shell

### Goal

Create `EditorNavbar` as a standalone component. The sidebar does not exist yet — the toggle button renders with a stub state in the parent. Everything visible in the navbar is correct and complete.

### UI Affordances

| ID | Affordance | Place | Wires Out |
|----|-----------|-------|-----------|
| U1 | Sidebar toggle button (PanelLeftOpen icon — stub state) | EditorNavbar — left section | → parent `onToggleSidebar` (stub) |

### Non-UI Affordances

| ID | Affordance | Wires Out |
|----|-----------|-----------|
| N1-stub | `isSidebarOpen` boolean state in parent (default `false`) | → U1 icon |

### Wiring

```mermaid
flowchart TB
    subgraph editorPage["PLACE: Editor Page (Parent)"]
        N1stub["N1-stub: isSidebarOpen state (false)"]
    end

    subgraph navbar["PLACE: EditorNavbar"]
        U1["U1: sidebar toggle button\n(PanelLeftOpen)"]
    end

    U1 -->|"click"| N1stub
    N1stub -.->|"icon update"| U1

    classDef ui fill:#ffb6c1,stroke:#d87093,color:#000
    classDef nonui fill:#d3d3d3,stroke:#808080,color:#000
    class U1 ui
    class N1stub nonui
```

### Files

| Action | File |
|--------|------|
| Create | `components/editor/editor-navbar.tsx` |
| Update | Editor page (add navbar with stub state) |

### Demo

> Navbar renders across the top of the editor page. Dark background, subtle bottom border, three sections. Toggle button shows PanelLeftOpen icon. Clicking it toggles the icon to PanelLeftClose and back.

---

## V2: Sidebar + Full Wiring

### Goal

Create `ProjectSidebar` and wire everything together. The navbar toggle now drives real sidebar visibility. Close button, tabs, and New Project button are all in place. Dialog pattern confirmed.

### UI Affordances

| ID | Affordance | Place | Wires Out |
|----|-----------|-------|-----------|
| U1 | Sidebar toggle button (PanelLeftOpen / PanelLeftClose — wired) | EditorNavbar — left section | → N1 |
| U2 | Close button (X icon) | ProjectSidebar — header | → N2 |
| U3 | "My Projects" tab trigger | ProjectSidebar — tabs | (local shadcn tab state) |
| U4 | "Shared" tab trigger | ProjectSidebar — tabs | (local shadcn tab state) |
| U5 | Empty placeholder content | ProjectSidebar — tab panels | — |
| U6 | "New Project" button (Plus icon) | ProjectSidebar — footer | (deferred — wired in future feature) |

### Non-UI Affordances

| ID | Affordance | Wires Out |
|----|-----------|-----------|
| N1 | `onToggleSidebar()` — toggles `isOpen` in parent | → `ProjectSidebar.isOpen`, U1 icon |
| N2 | `onClose()` — sets `isOpen = false` in parent | → `ProjectSidebar.isOpen` |
| N3 | `dialog.tsx` — shadcn component verified | (no changes; confirmed ready) |

### Wiring

```mermaid
flowchart TB
    subgraph editorPage["PLACE: Editor Page (Parent)"]
        N1["N1: onToggleSidebar()"]
        N2["N2: onClose()"]
    end

    subgraph navbar["PLACE: EditorNavbar"]
        U1["U1: sidebar toggle button\n(PanelLeftOpen / PanelLeftClose)"]
    end

    subgraph sidebar["PLACE: ProjectSidebar"]
        subgraph sidebarHeader["header"]
            U2["U2: close button (X)"]
        end
        subgraph sidebarTabs["shadcn Tabs"]
            U3["U3: My Projects tab"]
            U4["U4: Shared tab"]
            U5["U5: empty placeholder"]
        end
        subgraph sidebarFooter["footer"]
            U6["U6: New Project button"]
        end
    end

    subgraph dialogLayer["PLACE: Dialog (components/ui)"]
        N3["N3: dialog.tsx (shadcn) — verified"]
    end

    U1 -->|"click"| N1
    N1 -.->|"isOpen state"| sidebar
    N1 -.->|"icon update"| U1
    U2 -->|"click"| N2
    N2 -.->|"isOpen = false"| sidebar

    classDef ui fill:#ffb6c1,stroke:#d87093,color:#000
    classDef nonui fill:#d3d3d3,stroke:#808080,color:#000
    class U1,U2,U3,U4,U5,U6 ui
    class N1,N2,N3 nonui
```

### Files

| Action | File |
|--------|------|
| Create | `components/editor/project-sidebar.tsx` |
| Update | Editor page (wire real `isOpen` state to sidebar and navbar) |
| Verify | `components/ui/dialog.tsx` (confirm title / description / footer pattern works) |

### Demo

> Click the navbar toggle → sidebar slides in from the left. Click X or toggle again → sidebar slides out. My Projects and Shared tabs are switchable. New Project button visible at bottom. Dialog renders correctly with title, description, and footer when tested directly.

---

## Sliced Breadboard

```mermaid
flowchart TB
    subgraph slice1["V1: NAVBAR SHELL"]
        subgraph navbar1["EditorNavbar"]
            U1["U1: sidebar toggle button\n(PanelLeftOpen / stub)"]
        end
        N1stub["N1-stub: isSidebarOpen state"]
    end

    subgraph slice2["V2: SIDEBAR + FULL WIRING"]
        subgraph editorPage2["Editor Page (wired)"]
            N1["N1: onToggleSidebar()"]
            N2["N2: onClose()"]
        end
        subgraph sidebar2["ProjectSidebar"]
            U2["U2: close button (X)"]
            U3["U3: My Projects tab"]
            U4["U4: Shared tab"]
            U5["U5: empty placeholder"]
            U6["U6: New Project button"]
        end
        N3["N3: dialog.tsx (verified)"]
    end

    %% Force slice ordering
    slice1 ~~~ slice2

    %% Cross-slice wiring (U1 gets fully wired in V2)
    U1 -->|"click (wired in V2)"| N1
    N1 -.->|"isOpen"| sidebar2
    N1 -.->|"icon update"| U1
    U2 -->|"click"| N2
    N2 -.->|"isOpen = false"| sidebar2

    %% Slice boundary styling
    style slice1 fill:#e8f5e9,stroke:#4caf50,stroke-width:2px
    style slice2 fill:#e3f2fd,stroke:#2196f3,stroke-width:2px

    %% Nested subgraphs transparent
    style navbar1 fill:transparent,stroke:#888,stroke-width:1px
    style editorPage2 fill:transparent,stroke:#888,stroke-width:1px
    style sidebar2 fill:transparent,stroke:#888,stroke-width:1px

    %% Node styling
    classDef ui fill:#ffb6c1,stroke:#d87093,color:#000
    classDef nonui fill:#d3d3d3,stroke:#808080,color:#000
    class U1,U2,U3,U4,U5,U6 ui
    class N1,N1stub,N2,N3 nonui
```

**Legend:**
- **Green subgraph** = V1: Navbar Shell
- **Blue subgraph** = V2: Sidebar + Full Wiring
- **Pink nodes (U)** = UI affordances
- **Grey nodes (N)** = Code affordances
- **Solid lines** = Wires Out
- **Dashed lines** = Returns To / state updates
