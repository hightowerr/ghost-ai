# 02 Editor Chrome — Big Picture

**Selected shape:** A (Props-Controlled Floating Chrome)

---

## Frame

### Problem

- The editor workspace has no persistent chrome layer — no top navbar and no sidebar shell.
- Without a navbar, there is no structural frame for workspace controls, navigation toggles, or future editor actions.
- Without a sidebar, there is no way to switch projects or access project management from within the editor.
- These structural components must exist before any other editor feature can be composed on top of them.

### Outcome

- Every editor screen shares a reusable top navbar and floating left sidebar shell.
- The navbar provides a three-section frame with a sidebar toggle and reserved space for future controls.
- The sidebar is a floating overlay with project tabs and a primary action — it does not displace canvas content.
- The dialog styling pattern is confirmed and available for subsequent features to use without modification.

---

## Shape

### Fit Check (R × A)

| Req | Requirement | Status | A |
|-----|-------------|--------|---|
| R0 | Editor chrome is the reusable structural shell for all editor screens | Core goal | ✅ |
| R1 | Navbar provides a persistent top bar with toggle, layout sections, and dark theme | Must-have | ✅ |
| R1.1 | Fixed-height top navbar visible across all editor screens | Must-have | ✅ |
| R1.2 | Three layout sections: left, center, right | Must-have | ✅ |
| R1.3 | Left section contains sidebar toggle using PanelLeftOpen / PanelLeftClose icons | Must-have | ✅ |
| R1.4 | Right section is empty — reserved for future controls | Must-have | ✅ |
| R1.5 | Dark background with subtle bottom border | Must-have | ✅ |
| R2 | Sidebar is a floating overlay that slides in from the left | Must-have | ✅ |
| R2.1 | Sidebar floats above the canvas — does not push or shift content | Must-have | ✅ |
| R2.2 | Slide-in animation from the left | Must-have | ✅ |
| R2.3 | Controlled via `isOpen` and `onClose` props — parent manages state | Must-have | ✅ |
| R2.4 | Header contains "Projects" title and close button | Must-have | ✅ |
| R2.5 | My Projects and Shared tabs — both show empty placeholder state | Must-have | ✅ |
| R2.6 | Full-width "New Project" button with Plus icon at bottom | Must-have | ✅ |
| R3 | Dialog pattern is confirmed and ready for use in subsequent features | Must-have | ✅ |
| R3.1 | Uses color tokens from `globals.css` — no hardcoded hex values | Must-have | ✅ |
| R3.2 | Supports title, description, and footer actions | Must-have | ✅ |
| R4 | TypeScript strict-mode clean — no type errors, no lint violations | Must-have | ✅ |
| R5 | Components are designed for extension across future editor features | Must-have | ✅ |

### Parts

| Part | Mechanism | Flag |
|------|-----------|:----:|
| **A1** | **EditorNavbar** (`components/editor/editor-navbar.tsx`) | |
| A1.1 | Fixed-height bar (`h-12`, `flex items-center`), three layout sections | |
| A1.2 | Toggle button: PanelLeftOpen when closed, PanelLeftClose when open; calls `onToggleSidebar` | |
| A1.3 | Dark background (`bg-surface`) with subtle bottom border (`border-b border-default`) | |
| **A2** | **ProjectSidebar** (`components/editor/project-sidebar.tsx`) | |
| A2.1 | Fixed-position overlay (`fixed inset-y-0 left-0 z-50`), translate-x slide animation | |
| A2.2 | Controlled by `isOpen: boolean` + `onClose: () => void` props | |
| A2.3 | Header: "Projects" label + X close button | |
| A2.4 | shadcn `Tabs` — My Projects / Shared, both with empty placeholder state | |
| A2.5 | Full-width "New Project" button with Plus icon pinned to bottom | |
| **A3** | **Dialog pattern** | |
| A3.1 | `components/ui/dialog.tsx` (shadcn) — confirm it supports title, description, footer with globals.css tokens | |

### Breadboard

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

**Legend:**
- **Pink nodes (U)** = UI affordances (things users see and interact with)
- **Grey nodes (N)** = Code affordances (handlers, state, services)
- **Solid lines** = Wires Out (calls, triggers)
- **Dashed lines** = Returns To (state updates)

---

## Slices

### Sliced Breadboard

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

    %% Cross-slice wiring
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

    classDef ui fill:#ffb6c1,stroke:#d87093,color:#000
    classDef nonui fill:#d3d3d3,stroke:#808080,color:#000
    class U1,U2,U3,U4,U5,U6 ui
    class N1,N1stub,N2,N3 nonui
```

### Slices Grid

|  |  |
|:--|:--|
| **[V1: NAVBAR SHELL](./02-editor-v1-plan.md)**<br>⏳ PENDING<br><br>• Create `editor-navbar.tsx`<br>• Fixed-height bar, three sections<br>• Toggle button (PanelLeftOpen/Close)<br>• Stub `isOpen` state in parent<br><br>*Demo: Navbar renders; toggle changes icon* | **[V2: SIDEBAR + FULL WIRING](./02-editor-v2-plan.md)**<br>⏳ PENDING<br><br>• Create `project-sidebar.tsx`<br>• Floating overlay, translate-x animation<br>• My Projects / Shared tabs (empty state)<br>• Wire toggle + close; verify dialog.tsx<br><br>*Demo: Toggle opens sidebar; X closes it; tabs switch; dialog confirmed* |
