# Feature 03 — Auth — Slices

**Shape:** A (Clerk-native auth with email-based collaboration)

---

## Slice Definitions

| Slice | Name                              | Parts          | Demo                                                                              |
| ----- | --------------------------------- | -------------- | --------------------------------------------------------------------------------- |
| V1    | Auth Shell                        | A1, A2, A3, A4 | Hit app → redirect to sign-in. Sign in → land on editor (empty state).           |
| V2    | Project CRUD                      | A5, A6*, A7, A10 | Create project → appears in My Projects list. Rename and delete work.           |
| V3    | Workspace Access Gate             | A6†, A11       | Click owned project → workspace opens. Unknown URL → AccessDenied component.     |
| V4    | Collaborator Model + Liveblocks Auth | A8, A9      | Add collaborator by email → they can join the room. Non-member gets 403.          |

*A6 in V2: `getCurrentProjectIdentity()` and `getProjectsForUser()`
†A6 in V3: `getAccessibleProject()` and `userHasProjectAccess()`

---

## V1: Auth Shell

**Goal:** Clerk is wired up. All routes are protected. Users can sign in and sign up. Authenticated users land on the editor; unauthenticated users are redirected.

### Affordances

| ID  | Type   | Place                        | Name                        | Wires Out                            |
| --- | ------ | ---------------------------- | --------------------------- | ------------------------------------ |
| N1  | Non-UI | `proxy.ts`                   | `clerkMiddleware`           | → Clerk; `auth.protect()` all non-public routes |
| N2  | Non-UI | `app/layout.tsx`             | `ClerkProvider`             | → Clerk; wraps all pages             |
| U1  | UI     | `/sign-in`                   | `<SignIn>` (Clerk embedded) | → Clerk auth service                 |
| U2  | UI     | `/sign-up`                   | `<SignUp>` (Clerk embedded) | → Clerk auth service                 |
| N0  | Non-UI | `app/page.tsx`               | Root redirect               | → `/editor` (authed), `/sign-in` (unauthed) |

### Demo

Visit `/` → redirected to `/sign-in`. Sign in → redirected to `/editor` (empty state is fine). Visit any protected route while unauthenticated → redirected to `/sign-in`.

---

## V2: Project CRUD

**Goal:** Projects exist in the database. The editor home shows owned and shared projects. Users can create, rename, and delete projects.

### Affordances

| ID  | Type   | Place                                   | Name                        | Wires Out                       |
| --- | ------ | --------------------------------------- | --------------------------- | ------------------------------- |
| N3  | Non-UI | `lib/project-access.ts`                 | `getCurrentProjectIdentity` | → Clerk `auth()`, `currentUser()` |
| N5  | Non-UI | `lib/projects.ts`                       | `getProjectsForUser`        | → Prisma (Project, ProjectCollaborator) |
| N7  | Non-UI | `app/api/projects/route.ts`             | GET / POST                  | → Prisma                        |
| N8  | Non-UI | `app/api/projects/[projectId]/route.ts` | PATCH / DELETE              | → Prisma                        |
| U3  | UI     | `/editor`                               | `<EditorHomeClient>`        | → N7, N8                        |

### Demo

Sign in → editor home shows "My Projects" list (initially empty). Create a project → it appears. Rename it → name updates. Delete it → it disappears.

---

## V3: Workspace Access Gate

**Goal:** Navigating to a project workspace enforces ownership/collaborator check server-side. Unauthorized renders AccessDenied; authorized renders the workspace shell.

### Affordances

| ID  | Type   | Place                               | Name                    | Wires Out                           |
| --- | ------ | ----------------------------------- | ----------------------- | ----------------------------------- |
| N4  | Non-UI | `lib/project-access.ts`             | `getAccessibleProject`  | → Prisma (Project + ProjectCollaborator) |
| U4  | UI     | `/editor/[roomId]`                  | `<EditorWorkspaceClient>` | → N9 (Liveblocks auth, V4)        |
| U5  | UI     | `/editor/[roomId]`                  | `<AccessDenied>`        | (terminal)                          |

### Demo

Click an owned project → workspace opens (even if canvas is empty). Navigate to `/editor/unknown-id` → AccessDenied component renders.

---

## V4: Collaborator Model + Liveblocks Auth

**Goal:** The owner can add/remove collaborators by email. Liveblocks room tokens are only issued to verified project members.

### Affordances

| ID  | Type   | Place                                              | Name                     | Wires Out                         |
| --- | ------ | -------------------------------------------------- | ------------------------ | --------------------------------- |
| N6  | Non-UI | `lib/project-collaborators.ts`                     | `getProjectShareDetails` | → Prisma, Clerk `clerkClient()`   |
| N10 | Non-UI | `app/api/projects/[projectId]/collaborators`       | GET / POST / DELETE      | → Prisma, N6                      |
| N9  | Non-UI | `app/api/liveblocks-auth/route.ts`                 | POST                     | → N3 (V2), N4 (V3), Liveblocks   |

### Demo

Add a collaborator by email → they can access the project workspace. Remove them → they get 403 from Liveblocks auth. Non-member calling `/api/liveblocks-auth` gets 403.

---

## Sliced Breadboard

```mermaid
flowchart TB
    subgraph slice1["V1: AUTH SHELL"]
        subgraph signInPage["Sign-in / Sign-up"]
            U1["U1: &lt;SignIn&gt;"]
            U2["U2: &lt;SignUp&gt;"]
        end
        N1["N1: clerkMiddleware"]
        N2["N2: ClerkProvider"]
        N0["N0: root redirect"]
    end

    subgraph slice2["V2: PROJECT CRUD"]
        U3["U3: EditorHomeClient"]
        N3["N3: getCurrentProjectIdentity"]
        N5["N5: getProjectsForUser"]
        N7["N7: GET / POST projects"]
        N8["N8: PATCH / DELETE project"]
    end

    subgraph slice3["V3: WORKSPACE ACCESS GATE"]
        N4["N4: getAccessibleProject"]
        U4["U4: EditorWorkspaceClient"]
        U5["U5: AccessDenied"]
    end

    subgraph slice4["V4: COLLABORATOR MODEL + LIVEBLOCKS AUTH"]
        N6["N6: getProjectShareDetails"]
        N9["N9: POST liveblocks-auth"]
        N10["N10: collaborators API"]
    end

    %% Force slice ordering
    slice1 ~~~ slice2
    slice2 ~~~ slice3
    slice3 ~~~ slice4

    %% V1 wiring
    N1 -->|protect| Clerk
    N0 -->|authed| slice2
    N0 -->|unauthed| signInPage

    %% V2 wiring
    N3 --> Clerk
    N5 --> Prisma
    N7 --> Prisma
    N8 --> Prisma
    U3 --> N7
    U3 --> N8

    %% V3 wiring
    N4 --> Prisma
    N4 -->|authorized| U4
    N4 -->|unauthorized| U5
    U4 -->|join room| N9

    %% V4 wiring
    N9 --> N3
    N9 --> N4
    N9 -->|issue token| LB["Liveblocks"]
    N10 --> Prisma
    N10 --> N6
    N6 --> Clerk["Clerk"]

    Prisma["PostgreSQL (Prisma)"]

    %% Slice styling
    style slice1 fill:#e8f5e9,stroke:#4caf50,stroke-width:2px
    style slice2 fill:#e3f2fd,stroke:#2196f3,stroke-width:2px
    style slice3 fill:#fff3e0,stroke:#ff9800,stroke-width:2px
    style slice4 fill:#f3e5f5,stroke:#9c27b0,stroke-width:2px

    style signInPage fill:transparent,stroke:#888,stroke-width:1px

    classDef ui fill:#ffb6c1,stroke:#d87093,color:#000
    classDef nonui fill:#d3d3d3,stroke:#808080,color:#000
    classDef ext fill:#fff9c4,stroke:#f0c040,color:#000

    class U1,U2,U3,U4,U5 ui
    class N0,N1,N2,N3,N4,N5,N6,N7,N8,N9,N10 nonui
    class Clerk,Prisma,LB ext
```
