# Current Issues

_No open issues._

### Solved

1. My global Nav has no Clerk UI for log-in or log-off, sign up. — Added shared `EditorNavbar` component with Clerk `<UserButton>` (avatar + sign-out dropdown). Used in both `EditorHomeClient` and `EditorWorkspaceClient`, replacing their separate inline headers.

2. After log-in the page hangs with a rendering icon and doesn't load. — Root cause was PostgreSQL not running, causing Prisma's connection pool to hang before throwing `PrismaClientInitializationError`. Fixed by starting PostgreSQL (`sudo service postgresql start`). Note: Next.js 16 uses `proxy.ts` (not `middleware.ts`) as the middleware file convention — `proxy.ts` was already correct.
