# V3: Mobile Sidebar — Implementation Plan

## Goal

When the sidebar is open on a narrow viewport, render a full-viewport backdrop scrim behind the sidebar. Tapping the scrim calls `setSidebarOpen(false)` and dismisses the sidebar. On desktop the scrim is suppressed entirely via `md:hidden` — no JavaScript media query detection is required.

---

## Depends on

V1 and V2 can be complete or incomplete — V3 is independent. It only consumes the `sidebarOpen` state and `setSidebarOpen` setter that already exist in `EditorWorkspaceClient`. No new hooks, no API calls, no new components.

---

## Files

| Action | File |
|--------|------|
| Modify | `components/editor/editor-workspace-client.tsx` |

No other files change.

---

## Z-index Layering Reference

Before writing any markup, understand the stacking context inside `<main>`:

| Layer | Element | z-index |
|-------|---------|---------|
| Canvas | `<div className="absolute inset-0 ...">` | default (z-0 / auto) |
| Backdrop scrim | new `<div>` | `z-10` |
| Sidebar | `<aside>` inside `EditorSidebar` | `z-20` (already set) |

The sidebar is already declared at `z-20` in `editor-sidebar.tsx`. The backdrop must sit between the canvas and the sidebar, so `z-10` is the correct value. The canvas has no explicit z-index and stacks below both.

---

## Steps

### Step 1 — Understand the current JSX structure

Read `editor-workspace-client.tsx` before touching it. The current return tree is:

```tsx
<div className="flex flex-col h-screen bg-base">
  <EditorNavbar ... />
  <main className="flex-1 relative overflow-hidden">
    {sidebarOpen && <EditorSidebar projectName={project.name} />}
    {/* Canvas placeholder */}
    <div className="absolute inset-0 ...">...</div>
  </main>
</div>
```

The `<main>` element has `position: relative`. Do NOT place the backdrop inside `<main>` — `fixed` positioning breaks out of the nearest containing block only when `transform`, `filter`, or `will-change` are not set on an ancestor. Because `<main>` has none of those, `fixed inset-0` on a child of `<main>` will correctly cover the full viewport. However, for clarity and correctness — since the scrim must cover the full screen including the navbar — place the backdrop `div` as a sibling of `<main>` inside the root `<div>`, or as a direct child of the root `<div>`. The root `<div>` has no overflow clipping, so `fixed inset-0` placed there also reaches the full viewport.

The cleanest approach is to place the backdrop as the first child inside `<main>`, relying on `fixed inset-0` to escape `<main>`'s bounds and cover the full viewport (including the navbar). This is correct because `<main>` does not set `transform`, `filter`, `perspective`, or `will-change`, so it does not create a new containing block for fixed children. Verify this is still true when reading the file.

### Step 2 — Add the backdrop div

Inside `<main>`, immediately before the `EditorSidebar` conditional, add:

```tsx
{sidebarOpen && (
  <div
    className="fixed inset-0 z-10 bg-black/40 md:hidden"
    onClick={() => setSidebarOpen(false)}
    aria-hidden="true"
  />
)}
```

Exact class breakdown:

| Class | Purpose |
|-------|---------|
| `fixed inset-0` | Covers the full viewport — escapes `<main>`'s bounds and overlaps the navbar |
| `z-10` | Stacks above the canvas (z-auto) but below the sidebar (z-20) |
| `bg-black/40` | Semi-transparent dark scrim using Tailwind's opacity modifier — acceptable because it is not a semantic color token, just a raw overlay tint |
| `md:hidden` | Hides the scrim at the `md` breakpoint (768 px) and wider — no JS media query needed |
| `aria-hidden="true"` | Keeps the scrim out of the accessibility tree; it is a presentational overlay |

Do not add `pointer-events-none` — the scrim must be clickable. Do not add `cursor-pointer` — this is a transparent overlay, not a button.

### Step 3 — Verify click propagation is blocked by the sidebar

The sidebar (`<aside>`) in `EditorSidebar` sits at `z-20` and has a defined `width` (`w-56`). Clicks on the sidebar do not reach the backdrop because the sidebar element is rendered on top and the browser routes pointer events to the topmost element. No `stopPropagation` call is needed in `EditorSidebar`.

The backdrop's `onClick` only fires when the user clicks on the backdrop element itself — i.e., the area of the viewport not covered by the sidebar. This is correct behavior with no extra code.

### Step 4 — Resulting JSX

After the edit, the `<main>` block should read:

```tsx
<main className="flex-1 relative overflow-hidden">
  {sidebarOpen && (
    <div
      className="fixed inset-0 z-10 bg-black/40 md:hidden"
      onClick={() => setSidebarOpen(false)}
      aria-hidden="true"
    />
  )}

  {sidebarOpen && <EditorSidebar projectName={project.name} />}

  {/* Canvas placeholder — React Flow canvas mounts here */}
  <div className="absolute inset-0 flex items-center justify-center">
    <p className="text-sm text-copy-faint select-none">Canvas</p>
  </div>
</main>
```

No other changes to the file. The `setSidebarOpen` setter is already available in scope from the existing `useState` call.

### Step 5 — Type-check and lint

Run the following after saving:

```bash
npx tsc --noEmit
pnpm lint
```

Both must pass with zero errors before marking the slice done.

---

## What NOT to Do

- Do not add a `useEffect` or `window.matchMedia` check — `md:hidden` handles desktop suppression.
- Do not move `setSidebarOpen` into a `useCallback` unless a lint rule requires it — the inline arrow is fine for a one-liner setter.
- Do not add `stopPropagation` to `EditorSidebar` — z-index stacking already prevents click-through.
- Do not use a raw hex color or `bg-zinc-900/40` — `bg-black/40` is the correct overlay idiom (not a semantic token, but not a design-system color either; it is a standard translucent overlay).
- Do not place the backdrop outside the component return — it must be conditional on `sidebarOpen` so it is removed from the DOM when the sidebar is closed (no invisible overlay blocking clicks).
- Do not use `display: none` via state — let the conditional render handle mounting/unmounting cleanly.

---

## Testing

### Automated

- [ ] `npx tsc --noEmit` — zero type errors
- [ ] `pnpm lint` — zero lint warnings or errors

### Manual — Narrow viewport (375 px wide in browser devtools)

- [ ] Open the editor page for any project
- [ ] Click the sidebar toggle to open the sidebar
- [ ] A semi-transparent dark scrim appears behind the sidebar and in front of the canvas
- [ ] Click directly on the scrim (outside the sidebar panel) — sidebar closes, scrim disappears
- [ ] Click inside the sidebar panel — sidebar stays open, scrim remains visible (click does not propagate through the sidebar to the scrim)
- [ ] Close the sidebar via the toggle button — scrim disappears

### Manual — Wide viewport (1280 px wide)

- [ ] Open the editor page
- [ ] Click the sidebar toggle to open the sidebar — no scrim is visible (`md:hidden` suppresses it)
- [ ] Sidebar toggle still opens and closes the sidebar normally
- [ ] No layout shift or visual artifact from the hidden scrim element

### Edge case

- [ ] Resize the viewport from wide to narrow while the sidebar is open — scrim appears as soon as the viewport crosses the `md` breakpoint (768 px) because `md:hidden` is a CSS rule, not a JS check; it responds to viewport width in real time
