# Feature 03 — Auth

## Frame

### Problem

- Unauthenticated users can reach protected routes with no redirect
- Canvas projects have no owner — there is no user identity in the system
- Collaborators have no structured way to access shared projects
- Liveblocks rooms have no auth gate — any request can join any room

### Outcome

- Users sign in via Clerk and are redirected away from protected routes if unauthenticated
- Every project has a single owner (Clerk user ID)
- Collaborators can be invited by email and access their shared projects
- Liveblocks room tokens are only issued to verified project members
- Clerk sign-in/sign-up UI matches the app's dark design system

---

## Requirements (R)

| ID  | Requirement                                                                      | Status      |
| --- | -------------------------------------------------------------------------------- | ----------- |
| R0  | Users can sign in and sign up                                                    | Core goal   |
| R1  | Unauthenticated requests to protected routes redirect to /sign-in                | Must-have   |
| R2  | Authenticated users land on the editor home (project list)                       | Must-have   |
| R3  | Users can create, rename, and delete projects (owner only)                       | Must-have   |
| R4  | Project list separates owned projects from shared (collaborator) projects        | Must-have   |
| R5  | Only the owner or a collaborator can access a project workspace                  | Must-have   |
| R6  | The owner can add and remove collaborators by email                              | Must-have   |
| R7  | API route mutations enforce auth and ownership checks at every boundary          | Must-have   |
| R8  | Liveblocks room tokens are issued only to verified project members               | Must-have   |
| R9  | Clerk sign-in/sign-up appearance matches the app's dark design system            | Must-have   |

---

## A: Clerk-native auth with email-based collaboration

Clerk handles all identity. Projects store the Clerk `userId` as owner. Collaborators are tracked by email in a join table. Access is resolved server-side before every protected page and mutation.

| Part   | Mechanism                                                                                                                                   |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **A1** | **Route protection** — `proxy.ts`: `clerkMiddleware` + `createRouteMatcher`; all routes protected except `/sign-in(.*)` and `/sign-up(.*)` |
| **A2** | **Clerk provider** — `app/layout.tsx`: `ClerkProvider` with dark theme `appearance` vars mapped to the app's CSS custom property tokens     |
| **A3** | **Sign-in / Sign-up pages** — split-panel layout: marketing left column + Clerk embedded `<SignIn>` / `<SignUp>` on the right               |
| **A4** | **Root redirect** — `app/page.tsx`: server component; authenticated → `/editor`, unauthenticated → `/sign-in`                              |
| **A5** | **Project DB model** — `prisma/models/project.prisma`: `Project` (ownerId, name, status, canvasBlobUrl), `ProjectCollaborator` (projectId, email unique), `ProjectSpec`, `TaskRun` |
| **A6** | **Project access helpers** — `lib/project-access.ts`: `getCurrentProjectIdentity()` (Clerk `auth()` + `currentUser()`), `getAccessibleProject()` (owner OR email-matched collaborator OR), `userHasProjectAccess()` |
| **A7** | **Project CRUD API** — `GET /api/projects` (list owned); `POST /api/projects` (create, ownerId = userId); `PATCH /api/projects/[projectId]` (rename, owner only); `DELETE /api/projects/[projectId]` (delete, owner only) |
| **A8** | **Collaborator management API** — `GET /api/projects/[projectId]/collaborators` (share details with Clerk profile lookup); `POST` (add by email, owner only, no self-invite, no dupes); `DELETE` (remove by email, owner only) |
| **A9** | **Liveblocks auth endpoint** — `POST /api/liveblocks-auth`: verifies membership via `userHasProjectAccess()`, issues session token with userInfo (name, avatar, color from `getUserColor()`) |
| **A10** | **Editor home page** — `app/editor/page.tsx`: server component; fetches owned + shared projects via `lib/projects.getProjectsForUser()`, passes to `EditorHomeClient` |
| **A11** | **Editor workspace access gate** — `app/editor/[roomId]/page.tsx`: server component; `getAccessibleProject()` → unauthorized renders `<AccessDenied>`, authorized renders `<EditorWorkspaceClient>` |

---

## Fit Check (R × A)

| Req | Requirement                                                                      | Status    | A  |
| --- | -------------------------------------------------------------------------------- | --------- | -- |
| R0  | Users can sign in and sign up                                                    | Core goal | ✅ |
| R1  | Unauthenticated requests to protected routes redirect to /sign-in                | Must-have | ✅ |
| R2  | Authenticated users land on the editor home (project list)                       | Must-have | ✅ |
| R3  | Users can create, rename, and delete projects (owner only)                       | Must-have | ✅ |
| R4  | Project list separates owned projects from shared (collaborator) projects        | Must-have | ✅ |
| R5  | Only the owner or a collaborator can access a project workspace                  | Must-have | ✅ |
| R6  | The owner can add and remove collaborators by email                              | Must-have | ✅ |
| R7  | API route mutations enforce auth and ownership checks at every boundary          | Must-have | ✅ |
| R8  | Liveblocks room tokens are issued only to verified project members               | Must-have | ✅ |
| R9  | Clerk sign-in/sign-up appearance matches the app's dark design system            | Must-have | ✅ |

**Selected shape: A**

---

## Breadboard

### UI Affordances

| ID  | Place                   | Name                         | Wires Out                        |
| --- | ----------------------- | ---------------------------- | -------------------------------- |
| U1  | Sign-in page            | `<SignIn>` (Clerk embedded)  | → Clerk auth service             |
| U2  | Sign-up page            | `<SignUp>` (Clerk embedded)  | → Clerk auth service             |
| U3  | Editor home             | `<EditorHomeClient>`         | → N7 (project CRUD API)          |
| U4  | Editor workspace        | `<EditorWorkspaceClient>`    | → N9 (Liveblocks auth endpoint)  |
| U5  | Editor workspace        | `<AccessDenied>`             | (terminal — no wires out)        |

### Non-UI Affordances

| ID  | Place                                          | Name                         | Wires Out                                 |
| --- | ---------------------------------------------- | ---------------------------- | ----------------------------------------- |
| N1  | `proxy.ts`                                     | `clerkMiddleware`            | → Clerk; `auth.protect()` on all non-public routes |
| N2  | `app/layout.tsx`                               | `ClerkProvider`              | → Clerk; wraps all pages                  |
| N3  | `lib/project-access.ts`                        | `getCurrentProjectIdentity`  | → Clerk `auth()`, `currentUser()`         |
| N4  | `lib/project-access.ts`                        | `getAccessibleProject`       | → Prisma (Project + ProjectCollaborator)  |
| N5  | `lib/projects.ts`                              | `getProjectsForUser`         | → Prisma (Project, ProjectCollaborator)   |
| N6  | `lib/project-collaborators.ts`                 | `getProjectShareDetails`     | → Prisma, Clerk `clerkClient()`           |
| N7  | `app/api/projects/route.ts`                    | GET / POST                   | → Prisma                                  |
| N8  | `app/api/projects/[projectId]/route.ts`        | PATCH / DELETE               | → Prisma                                  |
| N9  | `app/api/liveblocks-auth/route.ts`             | POST                         | → N3, N4, Liveblocks SDK                  |
| N10 | `app/api/projects/[projectId]/collaborators`   | GET / POST / DELETE          | → Prisma, N6 (Clerk user lookup)          |

### Wiring Diagram

```mermaid
flowchart TB
    subgraph publicPages["PUBLIC PAGES"]
        subgraph signIn["Sign-in / Sign-up"]
            U1["U1: &lt;SignIn&gt;"]
            U2["U2: &lt;SignUp&gt;"]
        end
    end

    subgraph layout["APP LAYOUT"]
        N2["N2: ClerkProvider"]
    end

    subgraph middleware["MIDDLEWARE (proxy.ts)"]
        N1["N1: clerkMiddleware"]
    end

    subgraph rootPage["ROOT PAGE (/)"]
        root["server component\nauth check"]
    end

    subgraph editorHome["EDITOR HOME (/editor)"]
        U3["U3: EditorHomeClient"]
        N5["N5: getProjectsForUser"]
    end

    subgraph editorWorkspace["EDITOR WORKSPACE (/editor/[roomId])"]
        U4["U4: EditorWorkspaceClient"]
        U5["U5: AccessDenied"]
        N4["N4: getAccessibleProject"]
    end

    subgraph apiProjects["API: /api/projects"]
        N7["N7: GET / POST"]
        N8["N8: PATCH / DELETE"]
    end

    subgraph apiCollaborators["API: /api/projects/[id]/collaborators"]
        N10["N10: GET / POST / DELETE"]
        N6["N6: getProjectShareDetails"]
    end

    subgraph apiLiveblocks["API: /api/liveblocks-auth"]
        N9["N9: POST"]
    end

    subgraph accessHelpers["lib/project-access.ts"]
        N3["N3: getCurrentProjectIdentity"]
    end

    subgraph external["EXTERNAL"]
        Clerk["Clerk"]
        Prisma["PostgreSQL (Prisma)"]
        LB["Liveblocks"]
    end

    %% Middleware gates all routes
    N1 -->|protect| Clerk

    %% Root redirect
    root -->|authenticated| editorHome
    root -->|unauthenticated| signIn

    %% Editor home
    N5 --> Prisma
    U3 -->|project actions| N7
    U3 -->|project actions| N8

    %% Editor workspace
    N4 --> Prisma
    N4 -->|authorized| U4
    N4 -->|unauthorized| U5
    U4 -->|join room| N9

    %% Liveblocks auth
    N9 --> N3
    N9 --> N4
    N9 -->|issue token| LB

    %% Collaborators
    N10 --> Prisma
    N10 --> N6
    N6 --> Clerk

    %% Identity
    N3 --> Clerk

    %% API auth
    N7 --> Prisma
    N8 --> Prisma

    classDef ui fill:#ffb6c1,stroke:#d87093,color:#000
    classDef nonui fill:#d3d3d3,stroke:#808080,color:#000
    classDef ext fill:#fff9c4,stroke:#f0c040,color:#000

    class U1,U2,U3,U4,U5 ui
    class N1,N2,N3,N4,N5,N6,N7,N8,N9,N10 nonui
    class Clerk,Prisma,LB ext
```

**Legend:**
- **Pink nodes (U)** = UI affordances (things users see / interact with)
- **Grey nodes (N)** = Code affordances (middleware, handlers, helpers, data stores)
- **Yellow nodes** = External services (Clerk, PostgreSQL, Liveblocks)
- **Solid lines** = Wires Out (calls, triggers, writes)
