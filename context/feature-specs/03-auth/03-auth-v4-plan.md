# V4: Collaborator Model + Liveblocks Auth — Implementation Plan

**Feature:** 03 Auth
**Slice:** V4 of 4
**Status:** ⏳ PENDING

---

## Goal

Extend the project API with collaborator management endpoints (GET/POST/DELETE `/api/projects/[projectId]/collaborators`) and introduce the `lib/project-collaborators.ts` helper that enriches database collaborator records with Clerk user profiles. Gate the Liveblocks session token endpoint so only the project owner and active collaborators receive a room token — every other caller receives a 403. This completes the auth feature: any user who has been invited by email can reach the workspace and join the Liveblocks room; removing them immediately blocks further token issuance.

---

## Affordances

| ID  | Type   | Place                                                        | Name                     | Wires Out                                      |
|-----|--------|--------------------------------------------------------------|--------------------------|------------------------------------------------|
| N6  | Non-UI | `lib/project-collaborators.ts`                               | `getProjectShareDetails` | → Prisma (`ProjectCollaborator`), Clerk `clerkClient()` |
| N10 | Non-UI | `app/api/projects/[projectId]/collaborators/route.ts`        | GET / POST / DELETE      | → Prisma, N6                                   |
| N9  | Non-UI | `app/api/liveblocks-auth/route.ts`                           | POST                     | → N3 (`getCurrentProjectIdentity`, V2), N4 (`getAccessibleProject` / `userHasProjectAccess`, V3), Liveblocks node client (`lib/liveblocks.ts`) |

**Dependencies (must exist from prior slices):**

- `lib/project-access.ts` — `getCurrentProjectIdentity()` (N3, V2), `userHasProjectAccess()` (N4, V3)
- `lib/prisma.ts` — cached Prisma singleton
- `prisma/models/project.prisma` — `Project` and `ProjectCollaborator` models
- `lib/liveblocks.ts` — cached Liveblocks node client

---

## Files

| File                                                          | Action | Notes                                                                 |
|---------------------------------------------------------------|--------|-----------------------------------------------------------------------|
| `lib/project-collaborators.ts`                                | Create | `getProjectShareDetails` — Prisma lookup + Clerk profile enrichment   |
| `lib/liveblocks.ts`                                           | Create | Cached `Liveblocks` node client + `getUserColor()` helper             |
| `app/api/projects/[projectId]/collaborators/route.ts`         | Create | GET / POST / DELETE handlers; owner-only mutations                    |
| `app/api/liveblocks-auth/route.ts`                            | Create | POST handler; membership gate; session token issuance                 |

---

## Implementation Steps

### Step 1 — Install dependencies

The Liveblocks node package and Clerk server SDK need to be available:

```bash
npm install @liveblocks/node
```

`@clerk/nextjs` is already installed (`^7.3.0`). `clerkClient()` is available from `@clerk/nextjs/server`.

---

### Step 2 — `lib/liveblocks.ts`

Create a cached Liveblocks node client and a deterministic color helper.

```ts
import { Liveblocks } from "@liveblocks/node";

// Cached singleton — avoids re-instantiation across hot reloads in dev
const globalForLiveblocks = globalThis as unknown as { liveblocks?: Liveblocks };

export const liveblocks =
  globalForLiveblocks.liveblocks ??
  new Liveblocks({ secret: process.env.LIVEBLOCKS_SECRET_KEY! });

if (process.env.NODE_ENV !== "production") {
  globalForLiveblocks.liveblocks = liveblocks;
}

// Deterministic palette — maps any userId string to one of 8 fixed colors
const CURSOR_COLORS = [
  "#F87171", // red-400
  "#FB923C", // orange-400
  "#FBBF24", // amber-400
  "#34D399", // emerald-400
  "#38BDF8", // sky-400
  "#818CF8", // indigo-400
  "#E879F9", // fuchsia-400
  "#A78BFA", // violet-400
] as const;

export function getUserColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}
```

---

### Step 3 — `lib/project-collaborators.ts`

`getProjectShareDetails` loads `ProjectCollaborator` rows for a project and enriches each email with a Clerk user profile. Falls back to email-only when no matching Clerk user exists.

**Return type:**

```ts
export interface CollaboratorRecord {
  email: string;
  clerkUserId: string | null;
  name: string | null;       // Clerk firstName + lastName, or null
  imageUrl: string | null;   // Clerk profileImageUrl, or null
}

export interface ProjectShareDetails {
  projectId: string;
  ownerClerkId: string;
  collaborators: CollaboratorRecord[];
}
```

**Implementation:**

```ts
import { clerkClient } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export async function getProjectShareDetails(
  projectId: string
): Promise<ProjectShareDetails> {
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    select: { id: true, ownerId: true },
  });

  const rows = await prisma.projectCollaborator.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
    select: { email: true },
  });

  if (rows.length === 0) {
    return {
      projectId: project.id,
      ownerClerkId: project.ownerId,
      collaborators: [],
    };
  }

  // Clerk getUserList accepts an emailAddress array filter
  const client = await clerkClient();
  const clerkUsers = await client.users.getUserList({
    emailAddress: rows.map((r) => r.email),
    limit: rows.length,
  });

  const clerkByEmail = new Map(
    clerkUsers.data.flatMap((u) =>
      u.emailAddresses.map((e) => [
        e.emailAddress,
        {
          clerkUserId: u.id,
          name:
            [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || null,
          imageUrl: u.imageUrl ?? null,
        },
      ])
    )
  );

  const collaborators: CollaboratorRecord[] = rows.map((row) => {
    const profile = clerkByEmail.get(row.email);
    return {
      email: row.email,
      clerkUserId: profile?.clerkUserId ?? null,
      name: profile?.name ?? null,
      imageUrl: profile?.imageUrl ?? null,
    };
  });

  return {
    projectId: project.id,
    ownerClerkId: project.ownerId,
    collaborators,
  };
}
```

---

### Step 4 — `app/api/projects/[projectId]/collaborators/route.ts`

Three handlers. All require Clerk auth. POST and DELETE require project ownership.

**Shared auth guard pattern (inline, no extra abstraction):**

```ts
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getProjectShareDetails } from "@/lib/project-collaborators";
```

#### GET `/api/projects/[projectId]/collaborators`

Returns the enriched collaborator list. Owner or collaborator may call this.

**Response shape:**

```json
{
  "collaborators": [
    {
      "email": "alice@example.com",
      "clerkUserId": "user_abc",
      "name": "Alice Smith",
      "imageUrl": "https://img.clerk.com/..."
    }
  ]
}
```

```ts
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;

  // Verify caller is owner or collaborator before exposing member list
  const currentUser = await clerkClient().then((c) => c.users.getUser(userId));
  const primaryEmail = currentUser.emailAddresses.find(
    (e) => e.id === currentUser.primaryEmailAddressId
  )?.emailAddress;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = project.ownerId === userId;
  const isCollaborator =
    primaryEmail &&
    (await prisma.projectCollaborator.findUnique({
      where: { projectId_email: { projectId, email: primaryEmail } },
    })) !== null;

  if (!isOwner && !isCollaborator) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const details = await getProjectShareDetails(projectId);
  return NextResponse.json({ collaborators: details.collaborators });
}
```

#### POST `/api/projects/[projectId]/collaborators`

Adds a collaborator by email. Owner only. Rejects self-invite and duplicates.

**Request body:**

```json
{ "email": "alice@example.com" }
```

**Response:** `201` with `{ "collaborator": CollaboratorRecord }` on success.

```ts
export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (project.ownerId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const email: string = (body?.email ?? "").trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  // Prevent self-invite — resolve the owner's own email
  const client = await clerkClient();
  const ownerUser = await client.users.getUser(userId);
  const ownerEmails = ownerUser.emailAddresses.map((e) => e.emailAddress.toLowerCase());
  if (ownerEmails.includes(email)) {
    return NextResponse.json({ error: "Cannot invite yourself" }, { status: 400 });
  }

  // Upsert avoids duplicate-key errors on concurrent POST calls
  await prisma.projectCollaborator.upsert({
    where: { projectId_email: { projectId, email } },
    create: { projectId, email },
    update: {},
  });

  // Enrich response with Clerk profile
  const { collaborators } = await getProjectShareDetails(projectId);
  const added = collaborators.find((c) => c.email === email)!;
  return NextResponse.json({ collaborator: added }, { status: 201 });
}
```

#### DELETE `/api/projects/[projectId]/collaborators`

Removes a collaborator by email. Owner only.

**Request body:**

```json
{ "email": "alice@example.com" }
```

**Response:** `200` with `{ "removed": true }`.

```ts
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (project.ownerId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const email: string = (body?.email ?? "").trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 });

  await prisma.projectCollaborator.deleteMany({
    where: { projectId, email },
  });

  return NextResponse.json({ removed: true });
}
```

---

### Step 5 — `app/api/liveblocks-auth/route.ts`

The Liveblocks auth endpoint. Verifies the caller is an authenticated project member, then issues a short-lived session token scoped to that room. Uses `lb.prepareSession` + `session.allow` with `session.FULL_ACCESS`.

**Request:** `POST /api/liveblocks-auth?roomId=<projectId>`

The room ID is the project ID (set by `EditorWorkspaceClient` when calling `RoomProvider`).

```ts
import { auth } from "@clerk/nextjs/server";
import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { liveblocks, getUserColor } from "@/lib/liveblocks";
import { getCurrentProjectIdentity } from "@/lib/project-access"; // N3 (V2)
import { userHasProjectAccess } from "@/lib/project-access";      // N4 (V3)

export async function POST(req: Request) {
  // 1. Require Clerk session
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Extract and validate roomId (== projectId)
  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get("roomId");
  if (!roomId) {
    return NextResponse.json({ error: "Missing roomId" }, { status: 400 });
  }

  // 3. Verify the caller is the owner or an active collaborator
  //    userHasProjectAccess() queries Project + ProjectCollaborator; no extra DB round-trip
  const identity = await getCurrentProjectIdentity(); // resolves Clerk userId + primaryEmail
  const hasAccess = await userHasProjectAccess({
    projectId: roomId,
    userId: identity.userId,
    email: identity.email,
  });

  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 4. Resolve display name and avatar from Clerk
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const name =
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
      ?.emailAddress ??
    "Anonymous";
  const avatar = user.imageUrl ?? "";
  const color = getUserColor(userId);

  // 5. Prepare session and allow FULL_ACCESS to the room
  const session = liveblocks.prepareSession(userId, {
    userInfo: { name, avatar, color },
  });

  // FULL_ACCESS grants read + write to the specified room pattern
  session.allow(roomId, session.FULL_ACCESS);

  // 6. Exchange the session for a signed token and return it
  const { body, status } = await session.authorize();
  return new Response(body, { status });
}
```

**Notes on the Liveblocks session pattern:**
- `liveblocks.prepareSession(userId, { userInfo })` creates a session object keyed by the Clerk userId. The `userInfo` fields must match `UserMeta["info"]` in `liveblocks.config.ts`.
- `session.allow(roomId, session.FULL_ACCESS)` is the idiomatic v2 permission grant. It scopes the token to exactly one room.
- `session.authorize()` returns `{ body: string, status: number }` — these are forwarded directly as the HTTP response body so the Liveblocks client can parse the token.

---

### Step 6 — Verify `liveblocks.config.ts` UserMeta

`lib/liveblocks.ts` attaches `{ name, avatar, color }` to every session. The shared config must declare matching `UserMeta`:

```ts
// liveblocks.config.ts (created in feature 10)
declare global {
  interface Liveblocks {
    UserMeta: {
      id: string;
      info: {
        name: string;
        avatar: string;
        color: string;
      };
    };
  }
}
```

If this file does not yet exist, create it (or add the declaration) as part of this slice.

---

## Env Vars Required

| Variable                | Purpose                                                                                  |
|-------------------------|------------------------------------------------------------------------------------------|
| `LIVEBLOCKS_SECRET_KEY` | Server-side secret for `@liveblocks/node` — used by `liveblocks.prepareSession()`       |
| `DATABASE_URL`          | Prisma connection string (required by prior slices; no new requirement in V4)            |
| `CLERK_SECRET_KEY`      | Clerk server SDK (required by prior slices); `clerkClient()` reads this automatically    |

---

## Acceptance

- [ ] `GET /api/projects/[projectId]/collaborators` returns `{ collaborators: CollaboratorRecord[] }` for owner and existing collaborators; returns 403 for non-members
- [ ] Collaborator records include `email`, `clerkUserId`, `name`, and `imageUrl`; `name` and `imageUrl` fall back to `null` when no matching Clerk user exists
- [ ] `POST /api/projects/[projectId]/collaborators` with `{ "email": "alice@example.com" }` creates a `ProjectCollaborator` row and returns 201 with the enriched record
- [ ] POST returns 400 when the email is malformed or missing
- [ ] POST returns 400 when the owner attempts to add their own email
- [ ] POST by a non-owner returns 403
- [ ] `DELETE /api/projects/[projectId]/collaborators` with `{ "email": "alice@example.com" }` removes the collaborator and returns `{ "removed": true }`
- [ ] DELETE by a non-owner returns 403
- [ ] `POST /api/liveblocks-auth?roomId=<projectId>` returns a signed Liveblocks token for the project owner
- [ ] `POST /api/liveblocks-auth?roomId=<projectId>` returns a signed Liveblocks token for an active collaborator
- [ ] `POST /api/liveblocks-auth?roomId=<projectId>` returns 403 after a collaborator has been removed via DELETE
- [ ] `POST /api/liveblocks-auth` with no Clerk session returns 401
- [ ] `POST /api/liveblocks-auth` with a valid Clerk session but no project membership returns 403
- [ ] `POST /api/liveblocks-auth` with a missing or empty `roomId` returns 400
- [ ] Liveblocks session `userInfo` contains `name`, `avatar`, and `color`; `color` is deterministic for the same userId
- [ ] `getUserColor()` in `lib/liveblocks.ts` returns the same hex value for the same input across calls
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes
- [ ] `npm run build` passes
