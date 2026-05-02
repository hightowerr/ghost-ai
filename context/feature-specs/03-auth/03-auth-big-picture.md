# Feature 03 — Auth — Big Picture

**Selected shape:** A (Clerk-native auth with email-based collaboration)

---

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

## Shape

### Fit Check (R × A)

| Req | Requirement                                                               | Status    | A  |
| --- | ------------------------------------------------------------------------- | --------- | -- |
| R0  | Users can sign in and sign up                                             | Core goal | ✅ |
| R1  | Unauthenticated requests to protected routes redirect to /sign-in         | Must-have | ✅ |
| R2  | Authenticated users land on the editor home (project list)                | Must-have | ✅ |
| R3  | Users can create, rename, and delete projects (owner only)                | Must-have | ✅ |
| R4  | Project list separates owned projects from shared (collaborator) projects | Must-have | ✅ |
| R5  | Only the owner or a collaborator can access a project workspace           | Must-have | ✅ |
| R6  | The owner can add and remove collaborators by email                       | Must-have | ✅ |
| R7  | API route mutations enforce auth and ownership checks at every boundary   | Must-have | ✅ |
| R8  | Liveblocks room tokens are issued only to verified project members        | Must-have | ✅ |
| R9  | Clerk sign-in/sign-up appearance matches the app's dark design system     | Must-have | ✅ |

### Parts

| Part    | Mechanism                                                                                                                                                  | Flag |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | :--: |
| **A1**  | **Route protection** — `proxy.ts`: `clerkMiddleware` + `createRouteMatcher`; all routes protected except `/sign-in(.*)` and `/sign-up(.*)`                 |      |
| **A2**  | **Clerk provider** — `app/layout.tsx`: `ClerkProvider` with dark theme `appearance` vars mapped to the app's CSS custom property tokens                    |      |
| **A3**  | **Sign-in / Sign-up pages** — split-panel layout: marketing left column + Clerk embedded `<SignIn>` / `<SignUp>` on the right                              |      |
| **A4**  | **Root redirect** — `app/page.tsx`: server component; authenticated → `/editor`, unauthenticated → `/sign-in`                                             |      |
| **A5**  | **Project DB model** — `prisma/models/project.prisma`: `Project` (ownerId, name, status, canvasBlobUrl), `ProjectCollaborator` (projectId + email unique), `ProjectSpec`, `TaskRun` | |
| **A6**  | **Project access helpers** — `lib/project-access.ts`: `getCurrentProjectIdentity()`, `getAccessibleProject()` (owner OR email-matched collaborator), `userHasProjectAccess()` | |
| **A7**  | **Project CRUD API** — `GET /api/projects` (list owned); `POST` (create); `PATCH /api/projects/[id]` (rename, owner only); `DELETE` (delete, owner only)  |      |
| **A8**  | **Collaborator management API** — `GET/POST/DELETE /api/projects/[id]/collaborators`; owner-only mutations; Clerk profile lookup for display names/avatars |      |
| **A9**  | **Liveblocks auth endpoint** — `POST /api/liveblocks-auth`: verifies membership via `userHasProjectAccess()`, issues session token with userInfo           |      |
| **A10** | **Editor home page** — `app/editor/page.tsx`: fetches owned + shared projects via `getProjectsForUser()`, passes to `EditorHomeClient`                     |      |
| **A11** | **Editor workspace access gate** — `app/editor/[roomId]/page.tsx`: `getAccessibleProject()` → unauthorized → `<AccessDenied>`, authorized → `<EditorWorkspaceClient>` | |

### Breadboard

```mermaid
flowchart TB
    subgraph publicPages["PUBLIC PAGES"]
        subgraph signIn["Sign-in / Sign-up"]
            U1["U1: &lt;SignIn&gt;"]
            U2["U2: &lt;SignUp&gt;"]
        end
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

    N1 -->|protect| Clerk
    root -->|authenticated| editorHome
    root -->|unauthenticated| signIn
    N5 --> Prisma
    U3 -->|project actions| N7
    U3 -->|project actions| N8
    N4 --> Prisma
    N4 -->|authorized| U4
    N4 -->|unauthorized| U5
    U4 -->|join room| N9
    N9 --> N3
    N9 --> N4
    N9 -->|issue token| LB
    N10 --> Prisma
    N10 --> N6
    N6 --> Clerk
    N3 --> Clerk
    N7 --> Prisma
    N8 --> Prisma

    classDef ui fill:#ffb6c1,stroke:#d87093,color:#000
    classDef nonui fill:#d3d3d3,stroke:#808080,color:#000
    classDef ext fill:#fff9c4,stroke:#f0c040,color:#000

    class U1,U2,U3,U4,U5 ui
    class N1,N3,N4,N5,N6,N7,N8,N9,N10 nonui
    class Clerk,Prisma,LB ext
```

**Legend:**
- **Pink nodes (U)** = UI affordances (things users see / interact with)
- **Grey nodes (N)** = Code affordances (middleware, handlers, helpers)
- **Yellow nodes** = External services (Clerk, PostgreSQL, Liveblocks)
- **Solid lines** = Wires Out (calls, triggers, writes)

---

## Slices

### Sliced Breadboard

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

    slice1 ~~~ slice2
    slice2 ~~~ slice3
    slice3 ~~~ slice4

    N1 -->|protect| Clerk
    N0 -->|authed| slice2
    N0 -->|unauthed| signInPage
    N3 --> Clerk
    N5 --> Prisma
    N7 --> Prisma
    N8 --> Prisma
    U3 --> N7
    U3 --> N8
    N4 --> Prisma
    N4 -->|authorized| U4
    N4 -->|unauthorized| U5
    U4 -->|join room| N9
    N9 --> N3
    N9 --> N4
    N9 -->|issue token| LB["Liveblocks"]
    N10 --> Prisma
    N10 --> N6
    N6 --> Clerk["Clerk"]

    Prisma["PostgreSQL (Prisma)"]

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

### Slices Grid

|  |  |
|:--|:--|
| **[V1: AUTH SHELL](./03-auth-v1-plan.md)**<br>⏳ PENDING<br><br>• `proxy.ts` clerkMiddleware<br>• `ClerkProvider` + dark appearance<br>• Sign-in / Sign-up split-panel pages<br>• Root redirect (authed → /editor)<br><br>*Demo: Visit app → sign-in redirect. Sign in → editor (empty).* | **[V2: PROJECT CRUD](./03-auth-v2-plan.md)**<br>⏳ PENDING<br><br>• Prisma Project + Collaborator models<br>• `getCurrentProjectIdentity`, `getProjectsForUser`<br>• GET / POST / PATCH / DELETE project APIs<br>• Editor home server component<br><br>*Demo: Create project → appears in My Projects. Rename/delete work.* |
| **[V3: WORKSPACE ACCESS GATE](./03-auth-v3-plan.md)**<br>⏳ PENDING<br><br>• `getAccessibleProject`, `userHasProjectAccess`<br>• `/editor/[roomId]` server component<br>• `<AccessDenied>` component<br>• &nbsp;<br><br>*Demo: Own project → workspace opens. Unknown URL → AccessDenied.* | **[V4: COLLABORATOR MODEL + LIVEBLOCKS AUTH](./03-auth-v4-plan.md)**<br>⏳ PENDING<br><br>• Collaborators GET / POST / DELETE API<br>• `getProjectShareDetails` with Clerk lookup<br>• Liveblocks auth endpoint (membership gate)<br>• &nbsp;<br><br>*Demo: Add collaborator → they join the room. Non-member gets 403.* |
