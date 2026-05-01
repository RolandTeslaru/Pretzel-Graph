# API Keys (PretzelGraph SDK Auth)

Long-lived, hashed, revocable API keys for authenticating external clients (the planned `PretzelGraph` npm SDK) to the PretzelGraph backend. Used **instead of** Supabase JWTs for non-browser contexts.

## Motivation

Supabase JWTs are the wrong primitive for an SDK:
- Short-lived (~1h), need refresh — painful in server contexts (Lambdas, cron jobs, CI).
- Tied to a browser session model.
- Hard to revoke per-integration without nuking the user's whole session.

API keys (the Stripe / OpenAI / Anthropic pattern) give us:
- Long-lived credentials, no refresh dance.
- Per-integration revocation (revoke "Production server" without touching "CI").
- Audit trail per key (`last_used_at`).
- Identical downstream auth — both guards resolve to a `userId`, so every existing ownership check (`requester.userId === workflow.userId`) just works.

This is **distinct** from the existing `user_credentials` + Supabase Vault system. That stores secrets the workflows need to *use* (Anthropic keys, Google API keys) — needs to be decryptable, retrievable, passed to provider SDKs at execution time. API keys here are auth tokens — only need to be *verified*, never recovered. Different threat model, different storage (hash vs encrypt).

## Affected Files

### Create
- `packages/backend/src/services/ApiKeys/api-keys.module.ts`
- `packages/backend/src/services/ApiKeys/api-keys.controller.ts` — dashboard CRUD: `POST /create`, `GET /list`, `POST /revoke`.
- `packages/backend/src/services/ApiKeys/api-keys.service.ts` — generation, hashing, lookup, revoke.
- `packages/backend/src/auth/api-key-auth.guard.ts` — `ApiKeyAuthGuard`, mirrors `SupabaseAuthGuard` interface.
- `packages/shared/domain/ApiKey.ts` — Zod schema + API namespace.
- `packages/sdk/` — new package, the `PretzelGraph` npm client.

> **Depends on `SPECS/ownership-service.md`** — the SDK run path uses `OwnershipService.loadWorkflowOwner` to attribute the execution to the workflow owner.

### Modify
- `packages/shared/domain/index.ts` — export `ApiKey`.
- `packages/backend/src/app.module.ts` — register `ApiKeysModule`.
- `packages/backend/src/services/Execution/execution.controller.ts` — add a `runFromSdk` endpoint guarded by `ApiKeyAuthGuard`.

### Database
- New `api_keys` table (see schema below).
- RLS policies + immutability trigger.

## Domain Shape

```ts
// packages/shared/domain/ApiKey.ts
export namespace ApiKey {

  export const Id = z.string().brand("ApiKeyId")
  export type Id = z.infer<typeof Id>

  // The raw key. Format: pg_live_<32-char-base62>
  // Returned to the user once at creation, never stored, never returned again.
  export const Raw = z.string().regex(/^pg_live_[A-Za-z0-9]{32}$/)
  export type Raw = z.infer<typeof Raw>

  // Public-safe shape for the dashboard. Never includes key_hash.
  export const Schema = z.object({
    id:           Id,
    user_id:      Auth.User.Id,
    name:         z.string(),
    prefix:       z.string(),                  // first 12 chars, e.g. "pg_live_a1b2"
    last_used_at: z.iso.datetime().nullable(),
    expires_at:   z.iso.datetime().nullable(),
    revoked_at:   z.iso.datetime().nullable(),
    created_at:   z.iso.datetime(),
  })

  export namespace API {
    export namespace Create {
      export const Request  = z.object({ name: z.string().min(1).max(64) })
      export const Response = z.object({
        apiKey: Schema,
        raw:    Raw,        // returned once, here only
      })
    }
    export namespace List {
      export const Request  = z.object({})
      export const Response = z.object({ apiKeys: z.array(Schema) })
    }
    export namespace Revoke {
      export const Request  = z.object({ id: Id })
      export const Response = z.object({})
    }
  }
}
```

## `api_keys` Table

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK, `default gen_random_uuid()` | Internal id. Never sent as the auth token. |
| `user_id` | `uuid` FK → `users.id`, NOT NULL | Owner. Resolved from this on every authenticated request. |
| `name` | `text` NOT NULL | User-facing label, e.g. `"Production server"`. |
| `prefix` | `text` NOT NULL | First ~12 chars of the raw key. Stored unhashed for UX (dashboard list, audit logs). |
| `key_hash` | `text` NOT NULL | Argon2 hash of the **full** raw key. The only thing used for verification. |
| `last_used_at` | `timestamptz` nullable | Updated on each successful auth (best-effort). |
| `expires_at` | `timestamptz` nullable | Optional hard expiry. Null = never expires. |
| `revoked_at` | `timestamptz` nullable | Set on revoke. Auth fails if non-null. Soft delete. |
| `created_at` | `timestamptz` NOT NULL `default now()` |

```sql
create table api_keys (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id) on delete cascade,
  name         text not null,
  prefix       text not null,
  key_hash     text not null unique,
  last_used_at timestamptz,
  expires_at   timestamptz,
  revoked_at   timestamptz,
  created_at   timestamptz not null default now()
);
create index api_keys_user_id_idx  on api_keys(user_id);
create index api_keys_key_hash_idx on api_keys(key_hash) where revoked_at is null;
```

Deliberately **not** included:
- No `raw_key` column. Raw is shown once at creation, never recoverable. If lost, user creates a new key.
- No `scopes` / `permissions`. v1: every key acts fully as its owner.
- No per-workflow allowlist. Premature.

## RLS Policies

```sql
alter table api_keys enable row level security;

-- SELECT: users see their own keys.
-- Note: RLS gates rows, not columns. Dashboard queries MUST explicitly select
-- only (id, user_id, name, prefix, last_used_at, expires_at, revoked_at, created_at).
-- Never select key_hash from the authenticated client.
create policy "api_keys_select_own"
  on api_keys for select
  to authenticated
  using (user_id = auth.uid());

-- INSERT: must insert as yourself
create policy "api_keys_insert_own"
  on api_keys for insert
  to authenticated
  with check (user_id = auth.uid());

-- UPDATE: own rows only; trigger below enforces column immutability
create policy "api_keys_update_own"
  on api_keys for update
  to authenticated
  using      (user_id = auth.uid())
  with check (user_id = auth.uid());

create or replace function prevent_api_key_immutable_changes()
returns trigger language plpgsql as $$
begin
  if  new.id          is distinct from old.id
   or new.user_id     is distinct from old.user_id
   or new.prefix      is distinct from old.prefix
   or new.key_hash    is distinct from old.key_hash
   or new.expires_at  is distinct from old.expires_at
   or new.created_at  is distinct from old.created_at
  then
    raise exception 'api_keys: only name, revoked_at, last_used_at may be modified';
  end if;
  return new;
end $$;

create trigger api_keys_prevent_immutable
  before update on api_keys
  for each row execute function prevent_api_key_immutable_changes();

-- DELETE: forbidden for users (no policy = denied with RLS on).
-- Soft-revoke via revoked_at instead, preserves audit trail.
```

The auth guard (`ApiKeyAuthGuard`) runs **before** the user is identified, so it uses the **service-role client**, which bypasses RLS by default in Supabase. Two server-only queries it owns:

```sql
-- Auth lookup (service role)
select id, user_id, expires_at, revoked_at
  from api_keys
 where key_hash = $1
   and revoked_at is null
   and (expires_at is null or expires_at > now());

-- Best-effort touch (service role, fire-and-forget)
update api_keys set last_used_at = now() where id = $1;
```

`last_used_at` is intentionally writable by the server — the immutability trigger above lists only the truly immutable columns.

## Auth Flow

1. Client sends `Authorization: Bearer pg_live_<rest>`.
2. `ApiKeyAuthGuard.canActivate`:
   a. Extract bearer; reject if absent or malformed.
   b. Compute `key_hash = argon2(raw)`.
   c. Service-client lookup against `api_keys`. Reject if no match, revoked, or expired.
   d. Attach `req.user = { id: row.user_id }` and `req.apiKey = { id: row.id }`.
   e. Fire-and-forget `update api_keys set last_used_at = now() where id = ?`.
3. Downstream controllers behave identically to the `SupabaseAuthGuard` path. Every existing ownership check works unchanged.

## SDK Shape

New `packages/sdk/` (npm package, `@pretzel-graph/sdk`):

```ts
const pretzel = new PretzelGraph({ apiKey: process.env.PRETZEL_KEY })

await pretzel.runWorkflow({
  workflowId,            // server loads the active published version
  inputs?,               // map of values for the workflow's input nodes
  await?: boolean,       // true = wait for completion + return result
                         // false = fire-and-forget, return executionId
})
```

Notes:
- The SDK never sends `workflowData`. Server resolves the active published version from `version_control` (`is_active = true and workflow_id = ?`).
- New `Igniter.Sdk` variant: `{ variant: "sdk", inputs?: Record<string, unknown> }`. Backend uses this in `runFromSdk` (called from a new `POST /api/execution/sdk/run` endpoint guarded by `ApiKeyAuthGuard`).
- `Execution.userId` derives from `req.user.id` (the api key's owner). Same server-derived invariant as the rest of the unification spec.

## Implementation Order

1. **Domain.** Add `packages/shared/domain/ApiKey.ts`. Export from `index.ts`. Add `Igniter.Sdk` variant to `Execution.ts` (only after the unification spec lands).
2. **Database.** Apply table + RLS + trigger migration.
3. **Backend.**
   - `services/ApiKeys/` — module, controller, service. Endpoints under `/api/api-keys`. Use `SupabaseAuthGuard` (dashboard CRUD is browser-driven).
   - `auth/api-key-auth.guard.ts` — implementing `CanActivate` like `SupabaseAuthGuard`.
   - `services/Execution/execution.controller.ts` — add `@Post('sdk/run')` guarded by `ApiKeyAuthGuard`, wires through to `executionService.runFromSdk` (which loads the published workflow then delegates to `runCore`).
4. **SDK package.** `packages/sdk/`. `PretzelGraph` class wrapping axios. Method: `runWorkflow`. Bearer-token interceptor. Type-safe via shared domain types.
5. **Dashboard UI.** API keys page: list / create (modal showing the raw key once with a copy button + warning) / revoke. Lives wherever account settings live in the frontend.
6. **Smoke test.** Generate key in dashboard; install SDK in a sample script; call `runWorkflow({ workflowId })`; verify the run appears in the user's execution history with `igniter.variant === "sdk"`. Revoke the key; verify subsequent calls return 401.

## Open Questions

- **Argon2 vs bcrypt.** Argon2 is the modern recommendation; either works. Argon2 needs a node native module (`argon2`) — bcrypt is more widely available. Going with `argon2id` unless someone objects.
- **Key prefix format.** `pg_live_` is suggested to leave room for future `pg_test_` / `pg_dev_` if you ever want sandbox keys. Skip the test variant for now.
- **Rate limiting.** Per-key rate limits would be sensible eventually; out of scope for v1. Note in SDK docs that abuse will result in revocation.
- **Scoping (later spec).** When multi-tenant or shared-workflow models arrive, add a `scopes` jsonb column. Don't pre-build it.
