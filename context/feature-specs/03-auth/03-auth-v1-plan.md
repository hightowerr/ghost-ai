# V1: Auth Shell — Implementation Plan

## Goal

Wire Clerk into the Next.js 16 app so that every route is protected by default.
Unauthenticated requests to protected routes are redirected to `/sign-in`.
Authenticated users who visit `/` are redirected to `/editor`.
Sign-in and sign-up use Clerk's embedded `<SignIn>` and `<SignUp>` components styled
to match the app's dark design system via Clerk's `appearance` prop.

---

## Affordances

| ID | Type   | Place                              | Name                        | Wires Out                                                   |
|----|--------|------------------------------------|-----------------------------|-------------------------------------------------------------|
| N1 | Non-UI | `proxy.ts` (project root)          | `clerkMiddleware`           | Clerk; calls `auth.protect()` on all non-public routes      |
| N2 | Non-UI | `app/layout.tsx`                   | `ClerkProvider`             | Clerk; wraps every page with auth context                   |
| U1 | UI     | `app/sign-in/[[...sign-in]]/page.tsx` | `<SignIn>` (Clerk embedded) | Clerk auth service                                       |
| U2 | UI     | `app/sign-up/[[...sign-up]]/page.tsx` | `<SignUp>` (Clerk embedded) | Clerk auth service                                       |
| N0 | Non-UI | `app/page.tsx`                     | Root redirect               | `/editor` (authed) or `/sign-in` (unauthed)                 |

---

## Files

| File | Action | Notes |
|------|--------|-------|
| `proxy.ts` | create | Project root. Exports `clerkMiddleware` as default and `config` matcher. Public routes: `/sign-in(.*)`, `/sign-up(.*)`. All others call `auth.protect()`. |
| `app/layout.tsx` | modify | Import `ClerkProvider` from `@clerk/nextjs`. Wrap `{children}` inside `<ClerkProvider appearance={...}>`. Pass `dynamic` prop. |
| `app/page.tsx` | modify | Server component. Import `auth` from `@clerk/nextjs/server`. Call `auth()` to get `userId`. Redirect with `redirect()` from `next/navigation`. |
| `app/sign-in/[[...sign-in]]/page.tsx` | create | Server component. Renders a centered layout with the Clerk `<SignIn>` component. |
| `app/sign-up/[[...sign-up]]/page.tsx` | create | Server component. Renders a centered layout with the Clerk `<SignUp>` component. |

---

## Implementation Steps

### 1. Install / verify `@clerk/nextjs`

`@clerk/nextjs` ^7.3.0 is already listed in `package.json`. No additional install needed.

### 2. Create `proxy.ts`

Create `/home/yunix/learning-agentic/ideas/ghostai/proxy.ts` at the project root (same level as `app/`).

In Next.js 16, the middleware file convention is `proxy.ts` (renamed from `middleware.ts`).
The exported default function must be named `proxy` (or be a default export).
Clerk's `clerkMiddleware` returns a `NextMiddleware`-compatible function, so it can be
used as the default export directly.

```ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files; always run for API routes
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

Key points:
- `clerkMiddleware` is imported from `@clerk/nextjs/server`, not `@clerk/nextjs`.
- `createRouteMatcher` accepts glob patterns; `/sign-in(.*)` covers all Clerk sub-routes.
- `auth.protect()` on a non-public route redirects unauthenticated users to `/sign-in` automatically, using the `NEXT_PUBLIC_CLERK_SIGN_IN_URL` env var as the target.
- The matcher pattern excludes Next.js internals and static assets to avoid unnecessary auth checks on those requests.

### 3. Modify `app/layout.tsx`

Add `ClerkProvider` wrapping `{children}`.
Pass `dynamic` so auth state is available to all server components.
Pass an `appearance` object to match the dark design system tokens defined in `globals.css`.

```tsx
import { ClerkProvider } from "@clerk/nextjs";

const clerkAppearance = {
  variables: {
    colorBackground: "#111114",       // --bg-surface
    colorInputBackground: "#18181c",  // --bg-elevated
    colorInputText: "#f0f0f4",        // --text-primary
    colorText: "#f0f0f4",             // --text-primary
    colorTextSecondary: "#c0c0cc",    // --text-secondary
    colorPrimary: "#00c8d4",          // --accent-primary
    colorDanger: "#ff4d4f",           // --state-error
    borderRadius: "0.75rem",          // --radius (matches rounded-xl)
    fontFamily: "var(--font-geist-sans)",
    fontFamilyButtons: "var(--font-geist-sans)",
  },
  elements: {
    card: "bg-surface border border-surface-border rounded-2xl shadow-none",
    formButtonPrimary: "bg-brand text-[#001417] hover:opacity-90 rounded-xl",
    socialButtonsBlockButton: "border border-surface-border bg-elevated rounded-xl",
    formFieldInput: "bg-elevated border-surface-border text-copy-primary rounded-xl",
    footerActionLink: "text-brand",
    identityPreviewEditButton: "text-brand",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider dynamic appearance={clerkAppearance}>
      <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
        <body className="min-h-full flex flex-col bg-base text-copy-primary">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
```

Note: `ClerkProvider` must wrap the `<html>` element, not be inside `<body>`, to properly
provide context to all routes. The `dynamic` prop opts into dynamic rendering so server
components can read auth state.

### 4. Modify `app/page.tsx`

Replace the placeholder content with a server-side auth check and redirects.

```tsx
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    redirect("/editor");
  } else {
    redirect("/sign-in");
  }
}
```

This component never renders UI — it always redirects. The `redirect()` function from
`next/navigation` throws internally and terminates execution, so no explicit `return` is needed.

### 5. Create `app/sign-in/[[...sign-in]]/page.tsx`

The catch-all segment `[[...sign-in]]` is required by Clerk to handle all its internal
sub-paths (factor selection, SSO callbacks, etc.) under the `/sign-in` prefix.

```tsx
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex flex-1 items-center justify-center min-h-screen bg-base">
      <SignIn />
    </div>
  );
}
```

The `<SignIn>` component uses the `appearance` object provided by `ClerkProvider` in layout,
so no additional styling props are needed here.
Clerk reads `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL`, and
`NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` from env vars to configure its redirect URLs.

### 6. Create `app/sign-up/[[...sign-up]]/page.tsx`

Same pattern as step 5.

```tsx
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex flex-1 items-center justify-center min-h-screen bg-base">
      <SignUp />
    </div>
  );
}
```

---

## Env Vars Required

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Client-side Clerk publishable key; required by `ClerkProvider` |
| `CLERK_SECRET_KEY` | Server-side Clerk secret key; required by `auth()`, `currentUser()`, and `clerkMiddleware` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Tells Clerk where to redirect unauthenticated users; set to `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Tells Clerk where to redirect for sign-up; set to `/sign-up` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | Where Clerk redirects after a successful sign-in; set to `/editor` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | Where Clerk redirects after a successful sign-up; set to `/editor` |

These belong in `.env.local` for development. Keys are obtained from the Clerk dashboard
under the project's "API Keys" section.

---

## Acceptance

- [ ] `proxy.ts` exists at the project root and exports a default `clerkMiddleware` function plus a `config` object with a matcher
- [ ] Visiting `http://localhost:3000/` without a session redirects to `/sign-in`
- [ ] Visiting `http://localhost:3000/editor` without a session redirects to `/sign-in`
- [ ] Visiting `http://localhost:3000/sign-in` without a session renders the Clerk `<SignIn>` component with no redirect loop
- [ ] Visiting `http://localhost:3000/sign-up` without a session renders the Clerk `<SignUp>` component with no redirect loop
- [ ] Signing in via `/sign-in` redirects to `/editor` after successful authentication
- [ ] Signing up via `/sign-up` redirects to `/editor` after successful account creation
- [ ] Visiting `http://localhost:3000/` with a valid session redirects to `/editor`
- [ ] `ClerkProvider` wraps the root `<html>` element in `app/layout.tsx`
- [ ] The `<SignIn>` and `<SignUp>` components render with a dark background consistent with `--bg-base` (`#080809`); no white/light backgrounds visible
- [ ] No TypeScript strict-mode errors (`tsc --noEmit` passes)
- [ ] `_next/static`, `_next/image`, and `favicon.ico` are not blocked by the proxy matcher
