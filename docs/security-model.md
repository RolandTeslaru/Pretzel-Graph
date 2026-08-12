# Security Model

How a request proves it may do what it asks. Four layers answer four different questions, and
each is load-bearing for cases the others cannot reach.

| Layer | Mechanism | Answers | Lives in |
|---|---|---|---|
| 1 · Authentication | Guards | Who is asking? | `backend/src/auth/` |
| 2 · Route scope | `@Scoped()` + `ScopedGuard` | Do they own the resource named in the path? | `backend/src/auth/scopes.ts` |
| 3 · Row security | RLS policies | Which rows may they see, and what may those rows become? | Postgres |
| 4 · Column privileges | `GRANT` / `REVOKE` | Which columns may they write at all? | Postgres |

Layers 3 and 4 apply to **user traffic only**. The service connection is the table owner and
bypasses both — see *Deliberate gaps*.

## Principals

Every authenticated request carries one, attached by a guard and read by a param decorator
rather than re-derived in handlers.

- **`Principal.User`** — `{ type: 'user', userId }`. From a Supabase JWT via `UserAuthGuard`,
  which validates the bearer token against Supabase Auth and attaches `request.principal`.
  Read with `@AuthenticatedUser()`.
- **`Principal.Delegate`** — `{ type: 'delegate', actingAsUserId, executionId, via }`. A running
  execution acting for the user who owns it. `DelegateAuthGuard` derives it from the *execution
  token*, never from the request body — a node supplies what it wants written, not whose
  privileges the write runs under. `via` is audit-only and never an access-control input.
- **`Principal.Service`** — `{ type: 'service', service }`. Service-to-service, via
  `InternalAuthGuard` and a shared secret. No user identity.

`ApiKeyAuthGuard` exists but is currently mounted on no route.

Supabase is used **for authentication only**. All data access is Kysely over `pg`.

## Layer 1 — Authentication

| Guard | Credential | Attaches | Mounted on |
|---|---|---|---|
| `UserAuthGuard` | Supabase JWT (`Authorization: Bearer`) | `principal` | most controllers, class-level |
| `DelegateAuthGuard` | execution token header | `delegate` | `InternalChatController`, `WebhookTestController` |
| `InternalAuthGuard` | service secret | `internal.service` | `execution/{internal/run,update,finalise}` |

`UserAuthGuard` short-circuits if `request.principal` is already set, so mounting it twice — at
the controller and inside `@Scoped()` — costs one token validation, not two.

## Layer 2 — Route scope

A scoped route names its resource in the path and proves ownership before the handler runs.

```ts
@Post(':executionId/pause')
@Scoped('execution')
async pause(@ExecutionIdParam() executionId: Execution.Id) { … }
```

**One registry drives everything** (`auth/scopes.ts`). Each scope declares its path parameter,
its branded Zod schema, how to load it, and what it hangs off:

| Scope | Param | Loads | Parent |
|---|---|---|---|
| `workflow` | `:workflowId` | `loadWorkflowScope` | — |
| `execution` | `:executionId` | `loadExecutionContext` | `workflow` via `workflowId` |
| `chat` | `:chatId` | `loadChatScope` | `workflow` via `workflow_id` |

`ScopedGuard` parses the id with the branded schema, loads it, compares the owner to
`request.principal`, and attaches the result to `request.scopes`. Param decorators read **only**
from there — never `request.params` — so an id exists in a handler solely because a guard
vouched for it.

**Parent relations.** When a route names two scopes, the child verifies it belongs to the parent
in the URL. Owning both ids is not the same as the child belonging to that parent. Guards are
ordered parents-first from the registry, so this never depends on annotation order.

**Failures are uniform.** Unparseable id, missing row, wrong owner, broken relation — all raise
`NOT_FOUND`. Existence is not observable to a non-owner. An invalid id is rejected by the schema
before any query runs.

**Guard ordering is fixed by the mechanism.** `@Scoped()` names both guards in one `UseGuards`
call, because TypeScript applies method decorators bottom-up — a separate `@UseGuards(UserAuthGuard)`
written above `@Scoped()` would register *after* it and leave no principal to check against.

**`ScopedGuard` needs explicit `@Inject()` tokens.** Without them Nest constructs the guard with
no arguments at all and it fails at first execution, not at boot.

### When a route needs scoping

The test is **whether it acts on an id the database never validated**:

- **Scope it** when the side effect is built from the request id directly — a Redis signal, a
  queue job, a `SECURITY DEFINER` call. RLS protects rows, not actions, and there is no RLS on
  Redis or BullMQ.
- **Don't** when the effect is derived from a row RLS already returned. A foreign id throws at
  the query and the side effect is never reached.

Read paths through `DB.asUser` are covered by RLS; scoping them adds a lookup and changes
nothing. Those are listed in `RLS_COVERED_ROUTES` in `auth/scope-audit.ts` — a deliberate,
permanent set, kept separate from `UNMIGRATED_ROUTES`, which is pending work and expected to
stay empty.

### The boot audit

`auditScopedRoutes()` runs in `main.ts` before `app.listen`. It walks every controller and
aborts startup on a mismatch, in both directions: a path naming a scope's parameter must declare
that scope, and a declared scope must appear in the path. A forgotten guard is a crash at boot,
not a hole in production.

It keys on **parameter name**, so a route naming a `Workflow.Id` as `:id` is invisible to it —
`workbench/workflows/:id` and `library/workflows/:id` are currently in that position.

## Layer 3 — Row-level security

`DB.asUser` and `DB.asDelegate` open a transaction and set the RLS identity exactly as Supabase
would (`db/index.ts`):

```sql
set_config('role', 'authenticated', true)
set_config('request.jwt.claims', '{"sub": <userId>, "role":"authenticated"}', true)
```

`DB.asService` connects as the owner and is **not** policy-constrained.

| Connection | Role | RLS |
|---|---|---|
| `DATABASE_URL_APP` | `pretzel_app` → `authenticated` | enforced (no `BYPASSRLS`, not owner) |
| `DATABASE_URL_SERVICE` | `postgres` | bypassed (owner; `rls_forced` is false) |

### `USING` vs `WITH CHECK`

- **`USING`** filters *existing* rows — `SELECT`, `UPDATE`, `DELETE`. Failure is silent: the row
  isn't there, the statement reports 0 rows.
- **`WITH CHECK`** constrains the *resulting* row — `INSERT`, `UPDATE`. Failure raises `42501`.

`UPDATE` is the only command taking both, and **omitting `WITH CHECK` does not skip the check** —
Postgres defaults it to the `USING` expression. The trap is narrowness, not absence: a check of
`user_id = auth.uid()` guarantees ownership doesn't change and says nothing about any other
column. Always write both explicitly on `UPDATE`.

### Ownership is denormalised

Most tables carry `user_id`, so reads and deletes check that column directly. `chat_messages`
has no owner column and derives access from its parent chat on all four commands — which is why
`chat.database.erase` can delete messages filtered only on `chat_id` and still be safe.

Two `SELECT` policies are deliberately wider than ownership, for public sharing:

```sql
workflows        USING (user_id = auth.uid() OR is_public = true)
version_control  USING (user_id = auth.uid()
                        OR (is_active AND EXISTS(… w.is_public = true)))
```

This is why `GET /version-control/:publicationId` must **not** be scoped — an ownership check
would break public publication reads.

## Layer 4 — Column privileges

Table-level `UPDATE` is revoked from `authenticated`; only named columns are granted
(`SPECS/column-grants.sql`). A table-level grant implies every column and cannot be subtracted
from, hence revoke-then-grant.

| Table | Updatable by `authenticated` |
|---|---|
| `workflows` | `accent, data, description, display_name, icon, icon_color, is_public, locked` |
| `executions` | `duration, error, recording, session, status` |
| `version_control` | `is_active` |
| `chat_messages` | `content` |
| `credential_instance` | `blob, name` |
| `folders` | `description, display_name` |
| `api_keys` | `name, revoked_at` |
| `chats`, `users`, `user_credentials` | *(none)* |

Never granted: every foreign key, `id`, `created_at`, and `updated_at` where a `set_updated_at`
trigger maintains it (a trigger's own assignment is not subject to the caller's privileges).

**Adding a column requires a `GRANT`** or its first write fails with `42501`. That is the
intended direction — new columns are immutable until someone decides otherwise.

### How database errors become HTTP statuses

There are two layers, and the first one wins. `@DatabaseClass` wraps every method in
`catchDatabaseErrors` (`decorators/database-roles.ts`), which classifies driver errors before
they propagate:

| Postgres condition | Code | HTTP |
|---|---|---|
| `42501` insufficient_privilege (grant / RLS `WITH CHECK`) | `FORBIDDEN` | 403 |
| `NoResultError` (`executeTakeFirstOrThrow` found nothing) | `NOT_FOUND` | 404 |
| `23505` unique violation | `CONFLICT` | 409 |
| `23503` FK — referenced row missing | `NOT_FOUND` | 404 |
| `23502` / `22P02` | `BAD_REQUEST` | 400 |

Raw pg errors carry table and constraint names and rejected values; none of that reaches the
client — the wrapper keeps it server-side and returns a generic message.

`GlobalExceptionFilter` is the fallback for **inline queries that skip the decorator** (e.g.
`AuthService.getMe`), and maps the same conditions to the same statuses so the two paths agree.
A `42501` is a 403, not a 404: a grant or `WITH CHECK` rejection means the caller acted on its
own or new data and was refused — it hides no existence. Existence-hiding is the job of the
scope guards and `NoResultError`, both 404.

> Corollary: a rejected foreign-key immutability write returns **403**, and a missing/foreign
> resource returns **404**. Do not read a 403 as "not found".

## The foreign-key ownership invariant

Postgres evaluates FK constraints with RLS bypassed, so **a foreign key proves the parent row
exists, never that you own it**. Both halves are needed:

| | Mechanism |
|---|---|
| The FK must point at something you own **when created** | `INSERT … WITH CHECK` walking to the parent |
| The FK cannot change **afterwards** | column grants — FK columns are ungranted |

`chats`, `executions`, and `version_control` all walk to `workflows`; `workflows` walks to
`folders`. Each spells out `w.user_id = (select auth.uid())` rather than relying on the parent's
own `SELECT` policy — that policy admits public rows, so a bare `EXISTS` would match any public
workflow owned by someone else.

This is also what makes `user_owns_folder()` correct while checking only the immediate parent:
if every folder was created under a parent you owned, and `parent_folder_id` can never move,
the whole ancestor chain is yours by induction.

## Deliberate gaps

**The service path is unconstrained.** `DB.asService` runs as the table owner, so neither RLS
nor column privileges apply, and `rls_forced` is false on every table. An accidental `asService`
where `asUser` was meant silently disables both layers. The `DB.Transaction<Role>` branding
exists to make that choice explicit at every call site.

**`SECURITY DEFINER` functions run as the owner** and therefore bypass RLS entirely — they are
privilege gateways and must validate their own inputs. `reveal_credential_value`,
`create_user_credential`, `update_user_credential_value`, `handle_new_user` and
`handle_new_project` are `DEFINER` with an unpinned `search_path`. Not currently exploitable —
neither `authenticated` nor `anon` can create objects in `public` or a temp schema, so there is
nowhere to plant a shadowing object — but pinning them is cheap hardening.

**`publish_workflow` and `activate_publication` are `SECURITY INVOKER`**, so their writes do go
through the caller's policies.

**The parent relation has never fired** — no route currently declares two scopes, so the
child-belongs-to-parent check in `ScopedGuard` is present but unexercised.

**PostgREST is disabled** (Data API turned off, 2026-08-12). Supabase enables it by default,
which would let any holder of the public anon key reach the database over HTTP at `/rest/v1`,
bypassing the backend entirely. RLS and column grants held on that path too — but the app never
used it (zero `supabase.from`/`.rpc` calls after the webhook was moved to a direct pg
connection), so the surface was removed rather than merely defended. Auth (GoTrue, `/auth/v1`)
is a separate service and is unaffected; the only remaining `supabase-js` usage anywhere is
`supabase.auth.*`. Verified after flipping: `/rest/v1/*` returns `PGRST002`, while login, the
backend, and the webhook all still work.

## Verifying the model

- **Routes** — the boot audit runs automatically; a mismatch aborts startup.
- **Foreign keys** — the assertion at the bottom of `SPECS/column-grants.sql`. Empty means no FK
  is writable by `authenticated`.
- **Policies** — `SPECS/rlspolicies.json` is a regenerated snapshot of the live policies;
  `SPECS/rls-probe.sql` re-derives ground truth from the catalogues.

Verified end-to-end 2026-08-12 against the live database with two accounts: cross-account API
calls all denied (uniform 404), direct-database attacks all blocked (RLS violation / permission
denied / 0 rows), the `is_admin` self-escalation refused via both the app role and PostgREST,
and legitimate own-account operations unaffected.

Reference: `SPECS/column-grants.sql` and `SPECS/rls-fk-ownership.sql` carry the applied SQL,
each with its own rollback.
