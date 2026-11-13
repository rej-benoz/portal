# AGENTS.md

Conventions for anyone, human or AI assistant, working in this repo. See `README.md` for setup.

## Commands

Run everything from the repo root.

- `pnpm api:dev` / `pnpm portal:dev`: start the apps
- `pnpm db:migrate`: create and apply a migration after editing `app/api/prisma/schema.prisma`, then `pnpm --filter api db:generate`
- `pnpm db:seed`: reload the test tenants and users (password `123456`)
- `pnpm --filter api test`: API unit tests
- `pnpm --filter api lint` and `pnpm --filter portal lint`

## Layout

- `app/api`: NestJS 12, Prisma 7 with PostgreSQL. ESM, so relative imports end in `.js`.
- `app/portal`: Next.js 16 App Router with `cacheComponents` enabled. Read `app/portal/AGENTS.md` before changing portal code.
- The Prisma client is generated into `app/api/src/generated/prisma`. Don't edit it.

## Tenant context

The portal sends the active tenant's id in the `x-tenant-id` header (`apiFetch` in `app/portal/src/lib/api.ts`). The header is only a hint: never trust it on its own.

- Guard every tenant-scoped controller with `@UseGuards(AuthGuard, TenantGuard)` and list `TenantGuard` in the module's providers. `TenantGuard` looks the caller up in `tenant_users` and returns 403 unless they're an active member of that tenant.
- Read the verified tenant with `@CurrentTenant()`, which returns `{ id, role }`. Pass that to services, and filter every query on `tenant.id`.
- Load or change a record with both its id and the tenant id (e.g. `where: { id, tenantId: tenant.id }`), so a record from another tenant behaves like a missing one (404).

## Authorization

Use `isTenantAdmin(tenant)` from `app/api/src/tenancy/tenant-access.ts` for every tenant admin check, passing the `@CurrentTenant()` value. The role comes from `TenantGuard`'s database lookup. Access tokens don't carry memberships or roles, so a role change takes effect on the next request.

## API handlers

- Keep controllers thin and put logic in services.
- Validate every field in the DTO, including enumerated values (`@IsEnum(TenantRole)`), lengths and ranges. The API is called directly, not only through the portal. The global `ValidationPipe` (`app/api/src/app.setup.ts`) rejects unknown fields.
- Throw explicit Nest exceptions for expected failures (404 for missing records, 409 for conflicts). `PrismaExceptionFilter` maps leftover Prisma errors (P2025→404, P2002→409, P2034→409), but it's a safety net, not the plan.
- Use a transaction when a write depends on what you just read. For example, role changes run in a serializable transaction that re-checks the actor and the target.

## Testing

- Unit-test services with `createPrismaMock()` from `app/api/test/prisma-mock.ts`.
- Test guards, validation and status codes over HTTP with `createHttpApp()` from `app/api/test/http-app.ts` (see `members.http.spec.ts`). Cover authorization and tenant isolation for every new endpoint.
- Don't connect to the database in tests. CI has no PostgreSQL.
- Test files sit next to the code they test as `*.spec.ts`.

## Portal data fetching

- Server-side data loading lives in `app/portal/src/lib`. Pages call those functions inside a `<Suspense>` boundary.
- Don't cache tenant-scoped reads (members, projects): they depend on the caller's current membership and must reflect mutations right away. See `getMembers` in `app/portal/src/lib/members.ts`.
- Mutations are Server Actions that call `apiFetch` and then `refresh()` from `next/cache`. The API does the authorization; the portal only hides controls the user can't use.

## Style

- Match the surrounding code: Prettier defaults, single quotes in the API, double quotes in the portal.
- Keep comments short and only where the code isn't obvious.
