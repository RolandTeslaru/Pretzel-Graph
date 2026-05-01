# Ownership Service

A centralized backend service for resource-ownership and access checks. Replaces ad-hoc `where user_id = ?` lookups scattered across feature services. One extension point for the future permissions / sharing model.

## Motivation

Several specs (`execution-unification`, `api-keys`, eventual `webhook-authorization`, eventual `schedules`) all need the same "does user X own resource Y?" check. Without a shared layer:

- The check gets reimplemented per feature (workflow ownership in execution.service, again in webhook.service, again in scheduler.service).
- Adding a real permissions model later (shared workflows, team membership, role-based scopes) means hunting down every callsite. Easy to miss one — and a missed ownership check is a privilege-escalation bug, not a bug-bug.
- Observability is scattered. No single place to log denials, emit metrics, or feed an audit table.
- Service-client lifetime is muddled. Service-path checks (webhook / scheduled / SDK) need the service-role supabase client; today every caller would call `createServiceClient()` themselves.

A `@Global()` `OwnershipService` solves all four. Today its methods are 4-line lookups; tomorrow they consult a `workflow_permissions` table or a team-membership table without any caller change.

## Affected Files

### Create
- `packages/backend/src/auth/ownership.service.ts` — the `OwnershipService` class.
- `packages/backend/src/auth/auth.module.ts` — `@Global()` module exporting `OwnershipService`. (If an `AuthModule` already exists for the guards, fold `OwnershipService` into it.)

### Modify
- `packages/backend/src/app.module.ts` — import `AuthModule` so the service is globally available.
- Every feature module that injects it (`Execution`, `ApiKeys`, future `Webhook`, future `Schedules`). Each constructor adds `private readonly ownership: OwnershipService`.

### Database
- None. The service queries existing tables (`workflows`, `executions`, etc.).

## Service Shape

```ts
// packages/backend/src/auth/ownership.service.ts

import { Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { Auth, Execution, Workflow } from '@pretzel-graph/shared/domain';
import { SystemError } from '@pretzel-graph/shared/domain/SystemError';
import { createServiceClient } from '@/utils/supabase';

@Injectable()
export class OwnershipService {
  private readonly serviceSupabase = createServiceClient();

  /**
   * Interactive runs. Returns the workflow's owner id (equals requesterId on success).
   * Two-layer defense: RLS on the authenticated client gates the row,
   * and the explicit user_id comparison guards against RLS misconfiguration.
   * Throws NOT_FOUND on miss — never leak existence.
   */
  async assertWorkflow(
    supabase: SupabaseClient,           // authenticated client
    workflowId: Workflow.Id,
    requesterId: Auth.User.Id,
  ): Promise<Auth.User.Id> {
    const { data, error } = await supabase
      .from('workflows')
      .select('user_id')
      .eq('id', workflowId)
      .maybeSingle();

    if (error || !data || data.user_id !== requesterId)
      throw new SystemError(SystemError.Code.NOT_FOUND, 'Workflow not found');

    return data.user_id as Auth.User.Id;
  }

  /**
   * Control endpoints (pause, resume, terminate, suspend, heartbeat, awaitResult).
   * Throws NOT_FOUND on miss.
   */
  async assertExecution(
    supabase: SupabaseClient,
    executionId: Execution.Id,
    requesterId: Auth.User.Id,
  ): Promise<void> {
    const { data, error } = await supabase
      .from('executions')
      .select('user_id')
      .eq('id', executionId)
      .maybeSingle();

    if (error || !data || data.user_id !== requesterId)
      throw new SystemError(SystemError.Code.NOT_FOUND, 'Execution not found');
  }

  /**
   * Service-path runs (webhook, scheduled, SDK). No requester to compare against —
   * the trigger's authority was already established upstream (webhook key,
   * scheduler authorization, ApiKeyAuthGuard). This just resolves "whose
   * execution is this for billing / RLS / attribution."
   * Uses the service client because RLS would block a cross-user lookup.
   */
  async loadWorkflowOwner(
    workflowId: Workflow.Id,
  ): Promise<Auth.User.Id> {
    const { data, error } = await this.serviceSupabase
      .from('workflows')
      .select('user_id')
      .eq('id', workflowId)
      .maybeSingle();

    if (error || !data)
      throw new SystemError(SystemError.Code.NOT_FOUND, 'Workflow not found');

    return data.user_id as Auth.User.Id;
  }

  // Future methods, added per spec as resources gain ownership semantics:
  //   assertApiKey(supabase, apiKeyId, requesterId)
  //   assertChatAccess(supabase, chatId, requesterId)
  //   assertWebhookEndpoint(supabase, endpointId, requesterId)
  //   assertScheduleOwnership(supabase, scheduleId, requesterId)
}
```

## Module Wiring

```ts
// packages/backend/src/auth/auth.module.ts
import { Global, Module } from '@nestjs/common';
import { OwnershipService } from './ownership.service';

@Global()
@Module({
  providers: [OwnershipService],
  exports:   [OwnershipService],
})
export class AuthModule {}
```

Imported once in `app.module.ts`; available everywhere via DI:

```ts
constructor(
  private readonly ownership: OwnershipService,
  // …
) {}
```

If a Nest `AuthModule` already exists for the guards (`SupabaseAuthGuard`, `InternalAuthGuard`), add `OwnershipService` to its providers + exports rather than creating a second module.

## Design Notes

### Why a service, not plain functions
The functions are 4 lines today. They will multiply (~6+ resource types). The service buys: a single extension point for the future permissions model, observability in one place, natural reuse of the service-supabase client as a field, and the ability to swap to per-request caching with one decorator (`@Scope(Scope.REQUEST)`) if perf ever demands it. Cost in NestJS is one `constructor` line per consumer — trivial.

### Why singleton scope (default), not request-scoped
Today the methods are stateless lookups. Singleton means one instance, one service-supabase connection reused across requests. Switch to `@Scope(Scope.REQUEST)` only when adding a per-request lookup cache becomes worthwhile.

### Why `maybeSingle()` not `single()`
`single()` throws Supabase's PGRST116 on zero rows, which is a 406 in PostgREST and confusing to translate into our `SystemError`. `maybeSingle()` returns `data: null` cleanly and lets the explicit branch raise the right error code.

### Why 404, not 403
Returning 403 confirms the resource exists, just that the caller can't access it. That's an information leak (lets someone enumerate executionIds, workflowIds, etc.). 404 is indistinguishable from "no such resource" — denies enumeration.

### What the service does NOT do
- **Not a guard.** Guards run before the body is parsed; ownership checks need the body's `executionId` / `workflowId`. Keep it as a service called from controllers/services.
- **Not authentication.** Identity resolution is the guards' job. The service receives `requesterId` from `req.user.id`, never from the body.
- **Not authorization in the broad sense.** v1 is "owner only." When permissions get richer (shared workflows, team membership, role-based scopes), the methods grow internally — the call signatures stay the same.

## Implementation Order

1. Create `OwnershipService` with the three methods above.
2. Create or extend `AuthModule` to provide it globally. Import in `app.module.ts`.
3. Migrate callers as their feature specs land:
   - `execution-unification` → uses `assertWorkflow`, `assertExecution`, `loadWorkflowOwner`.
   - `api-keys` → uses (eventually) `assertApiKey` for revoke/edit endpoints; uses `loadWorkflowOwner` from the SDK run path.
   - Future `webhook-authorization` → adds `assertWebhookEndpoint`.
   - Future `schedules` → adds `assertScheduleOwnership`.

## Open Questions

- **Audit logging.** Should denials write to an `auth_audit` table out of the box, or is that future scope? Lean future scope — the hook is in one place, easy to add when needed.
- **Cache layer.** Per-request `Map`-based cache, request-scoped service. Defer until a profiler shows the lookups matter.
- **Method naming convention.** `assertX` = throws on failure, returns void or owner id. `canX` = returns boolean, never throws. Sticking with `assertX` for v1 since callers always want to bail on failure; add `canX` variants only when a UI needs "show this button if allowed" without throwing.
