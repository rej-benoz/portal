# Assessment Tasks

The requirements in this file are the source of truth. The repo may contain outdated or incorrect guidance, the way real codebases do. When something in the code or docs conflicts with a requirement, the requirement wins.

You may use AI tools. Along with your code, include a short section titled **"Where I disagreed with the repo or my AI"**, listing anything you chose not to follow and why.

## Getting started

1. **Clone this repository** and push it to your own GitHub account. Keep the repository private.
2. Clone your now repository and follow [Run it locally](README.md#run-it-locally) in the README.
3. Work through the **To do** sections below, committing to your fork as you go.

## Submitting

When you're done, send us:

- the URL of your repository, with the reviewers we named added as collaborators
- the live portal and API URLs from the hosting task
- your **"Where I disagreed with the repo or my AI"** notes, either in a Markdown file in your fork or in your submission message

## Done

- [x] **Monorepo setup:** NestJS API in `app/api`, Next.js portal in `app/portal`, one pnpm workspace
  - [x] `pnpm api:dev` and `pnpm portal:dev` run from the repo root
  - [x] One `.env` at the root is loaded by both apps
  - [x] `.env.example` lists every variable
- [x] **Database:** Prisma migration for `User`, `Tenant` and `TenantUser` (role `ADMIN` / `MEMBER`)
- [x] **Seeder:** 10 users, all with password `123456`
  - [x] 1 user is Admin of 2 tenants (`alice`)
  - [x] 1 user is Admin of 1 tenant and Member of another (`bob`)
  - [x] 1 user is Member of 2 tenants (`carol`)
  - [x] The other 7 users have 1 tenant each
  - [x] Safe to re-run, with no duplicates
- [x] **Login:** username and password form, session in an httpOnly cookie
- [x] **Dashboard:** tenant switcher, static sample data, Admin-only panel
- [x] **Docs:** `README.md` with local setup

## Done: tenant members page

Built on the starting point in `app/api/src/members` (API) and `app/portal/src/lib/members.ts` (portal). The page is at `/dashboard/members`.

### 1. Display organization members

- [x] Page that lists the current organization's members, showing for each:
  - [x] Member name
  - [x] Email address
  - [x] Role (Admin or Member)
  - [x] Account status (new `User.status`: `ACTIVE` / `SUSPENDED`; suspended users can't sign in and their tokens stop working)
- [x] Loading state
- [x] Error state
- [x] Empty state

### 2. Update a member's role

- [x] An authorized administrator can change a member's role
- [x] Only supported role values are accepted
- [x] The UI reflects a successful update
- [x] A failed update shows an appropriate error
- [x] An administrator can't accidentally remove their own admin access (own row is read-only in the UI; the API returns 409)

### 3. Enforce authorization and tenant isolation

- [x] Users can only access members of a tenant they're authorized for
- [x] The server establishes and validates the tenant context; it never trusts a client-supplied tenant ID (`TenantGuard` checks `x-tenant-id` against `tenant_users` on every request)
- [x] Only authorized administrators can update member roles (role read from the database, not the token, and re-checked in a serializable transaction)
- [x] Invalid or unauthorized requests don't modify data

### 4. Validate and persist changes

- [x] Validate request payloads on the server
- [x] Persist successful role changes in PostgreSQL
- [x] Return appropriate HTTP status codes and useful error responses
- [x] Handle missing members
- [x] Handle invalid role values

### 5. Testing

- [x] Meaningful automated tests covering the functionality (46 tests: service unit tests plus HTTP tests through the real guards and validation, with Prisma mocked)
- [x] Tests for authorization
- [x] Tests for tenant isolation

## Done: projects module (CRUD)

A tenant-scoped CRUD module to build the next assessment on. Every member can read projects; only admins can create, edit or delete them.

- [x] **Database:** `Project` model and migration (`name` unique per tenant, `description`, `status` `ON_TRACK` / `AT_RISK` / `DONE`, `progress` 0-100, `createdBy`)
- [x] **Seeder:** 7 sample projects across Acme, Globex and Initech, safe to re-run
- [x] **API** (`app/api/src/projects`): `GET /projects`, `GET /projects/:id`, `POST /projects`, `PATCH /projects/:id`, `DELETE /projects/:id`
  - [x] Behind `AuthGuard` + `TenantGuard`; every query is filtered on the verified tenant, so another tenant's project returns 404
  - [x] DTO validation (required non-blank name, max lengths, status enum, integer progress 0-100, unknown fields rejected)
  - [x] Status codes: 201 create, 204 delete, 400 invalid payload, 403 non-admin write or foreign tenant, 404 missing, 409 duplicate name
- [x] **Portal page** `/dashboard/projects`: list, create form, inline edit, delete with confirmation; loading, error and empty states; read-only for members
- [x] **Tests:** service unit tests and HTTP tests for authorization, tenant isolation and validation

## Done: shared groundwork

- [x] `TenantGuard`, `@CurrentTenant()` and `isTenantAdmin(tenant)` in `app/api/src/tenancy` for any tenant-scoped module
- [x] `PrismaExceptionFilter` maps leftover Prisma errors (P2025→404, P2002→409, P2034→409)
- [x] `createHttpApp()` in `app/api/test/http-app.ts` for HTTP-level tests without a database
- [x] Header navigation (Overview / Members / Projects); the tenant switcher keeps the current page
- [x] Access tokens carry identity only (no memberships or roles)
- [x] `AGENTS.md` updated so its guidance matches the code (no more misleading conventions)
- [x] `README.md` documents the new pages, endpoints, error codes and data model

## To do: roles and permissions

Today every member is either an Admin or a Member, and what each role can do is fixed in the code. Tenants want to define their own roles.

Design and build a roles and permissions module that covers the API, the database and the portal. You decide how it's modelled and how it fits into what's already here.

### Requirements

- [ ] Admin and Member keep working, each with capabilities you define
- [ ] An admin can create new roles, edit them, and assign them to members
- [ ] An admin can choose which permissions a role has
- [ ] A user's permissions decide what they can see and do in the portal, and the API enforces them
- [ ] Permission changes reach users who are already signed in, without them signing out

Assume tenants can have tens of thousands of members, with permission checks on every request.

For example, an admin creates a role that can only view projects and assigns it to a member. That member can now see projects and nothing else.

### What we'll look at

- How you design the solution and the trade-offs you make
- How it handles security and the edge cases you find
- How well it fits the existing codebase
- Tests

In your submission, briefly explain your design and the decisions behind it. Also describe how you'd roll this out to a production tenant that already has users, without downtime. A written plan is enough; you don't need to build it.

## To do: hosting

The API and its database go on **Railway**, and the portal goes on **Vercel**. Deploy the API first, because the portal needs its URL.

### 1. Railway: PostgreSQL and API

- [ ] Push the repo to GitHub.
- [ ] Create a Railway project and add a **PostgreSQL** database.
- [ ] Add a service from the GitHub repo for the API. Leave **Root Directory** empty: pnpm needs the workspace root and its lockfile.
- [ ] Set the service's commands:

  | Setting | Value |
  |---|---|
  | Build command | `pnpm install --frozen-lockfile && pnpm api:build` |
  | Pre-deploy command | `pnpm db:deploy` |
  | Start command | `pnpm api:start` |
  | Watch paths | `app/api/**` |

- [ ] Set the service's variables:

  | Variable | Value |
  |---|---|
  | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (reference to the Railway database) |
  | `JWT_SECRET` | A long random string, e.g. from `openssl rand -base64 32` |
  | `JWT_EXPIRES_IN` | `1d` |
  | `PORTAL_URL` | The Vercel URL from step 2. Update it once the portal is deployed. |

  Don't set `API_PORT` here. Railway injects `PORT` and the API falls back to it.
- [ ] Under **Networking**, generate a public domain for the API.
- [ ] Seed the hosted database from your machine. Use the database's **public** connection URL from Railway, because the internal one only works inside Railway:

  ```bash
  DATABASE_URL="<railway public database url>" pnpm db:seed
  ```

- [ ] Check it: `curl -X POST https://<api-domain>/auth/login -H 'content-type: application/json' -d '{"username":"alice","password":"123456"}'` returns an `accessToken`.

### 2. Vercel: portal

- [ ] Import the GitHub repo into Vercel.
- [ ] Set **Root Directory** to `app/portal`. Vercel detects Next.js and pnpm and installs from the workspace root.
- [ ] Add the environment variable `NEXT_PUBLIC_API_URL` = `https://<api-domain>` (no trailing slash). It's built into the app, so redeploy after changing it.
- [ ] Deploy, then set `PORTAL_URL` on Railway to the Vercel URL.
- [ ] Check it: open the Vercel URL, sign in as `alice` / `123456`, switch between Acme and Globex, then sign out.

### 3. Submission

- [ ] Add the live URLs here and to the README:
  - Portal: `https://…vercel.app`
  - API: `https://…up.railway.app`
- [ ] Make sure no real secrets are committed.
