# 02 Editor Chrome — Frame

## Source

> We need the base chrome components that frame every editor screen — the top navbar and the left sidebar shell. These will be reused and extended in every chapter that follows.
>
> ### Editor Navbar
>
> Create `components/editor/editor-navbar.tsx`.
>
> Requirements:
>
> - fixed-height top navbar
> - left, center, and right sections
> - left section contains sidebar toggle button
> - use `PanelLeftOpen` / `PanelLeftClose` icons based on sidebar state
> - right section stays empty for now
> - dark background with subtle bottom border
>
> ### Project Sidebar
>
> Create `components/editor/project-sidebar.tsx`.
>
> Requirements:
>
> - sidebar should float above the editor canvas
> - opening it should not push page content
> - slides in from the left
> - accepts `isOpen` and `onClose` props
> - header with `Projects` title + close button
> - shadcn `Tabs`:
>   - My Projects
>   - Shared
> - both tabs show empty placeholder state
> - full-width `New Project` button at the bottom with `Plus` icon
>
> ### Dialog Pattern
>
> Use the existing color tokens from `globals.css` for dialog styling.
>
> Support:
>
> - title
> - description
> - footer actions
>
> Do not build actual dialogs yet.
>
> ### Check when done
>
> - new components compile without TypeScript errors
> - no lint errors
> - dialog pattern is ready for future use

---

## Problem

- The editor workspace has no persistent chrome layer — no top navbar and no sidebar shell.
- Without a navbar, there is no structural frame for workspace controls, navigation toggles, or future editor actions.
- Without a sidebar, there is no way to switch projects or access project management from within the editor.
- These structural components must exist before any other editor feature can be composed on top of them.

## Outcome

- Every editor screen shares a reusable top navbar and floating left sidebar shell.
- The navbar provides a three-section frame with a sidebar toggle and reserved space for future controls.
- The sidebar is a floating overlay with project tabs and a primary action — it does not displace canvas content.
- The dialog styling pattern is confirmed and available for subsequent features to use without modification.
