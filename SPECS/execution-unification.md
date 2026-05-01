# Execution Unification

Collapse `Orchestrator` (jobs / control / queue) and `ExecutionSession` (runtime state / per-node events) into a single `Execution` domain. Job and Session become 1:1 — every execution is a one-shot thing.

## Motivation

Today there are two parallel domains for what is conceptually one thing:

- `Orchestrator` owns the `Job` (id, status, trigger, control signals, lifecycle events) and writes to the `jobs` table.
- `ExecutionSession` owns the runtime state blob (node statuses, edge state, output projections, messages) and writes to `execution_sessions`. The two were linked by a nullable `jobs.execution_session_id` FK because historically a session could outlive a job (multiple jobs per session).

That assumption no longer holds. Sessions are now one-shot — created, run, never reused. Maintaining two domains, two tables, two services, two SDKs, and two realtime channels for one logical entity is dead weight: it spreads logic, doubles the realtime plumbing on the frontend, and forces awkward joins (`get_session_metas`, `get_session_meta` RPCs) just to surface "which job ran this session."

It also enables the security fixes called out below — having one entity with one owner makes the ownership check uniform across every control endpoint.

## Affected Files

### Delete
- `packages/shared/domain/Orchestrator.ts`
- `packages/shared/domain/ExecutionSession.ts`
- `packages/backend/src/services/Orchestrator/` (entire directory)
- `packages/backend/src/services/ExecutionSession/` (entire directory)
- `packages/frontend/src/routes/workflow/-SDKs/OrchestratorSDK/` (entire directory)
- `packages/frontend/src/routes/workflow/-SDKs/ExecutionSessionSDK/` (entire directory)

### Replace / fill in
- `packages/shared/domain/Execution.ts` — currently a stub; becomes the unified domain (see "Domain Shape" below).
- `packages/shared/domain/index.ts` — drop `Orchestrator` / `ExecutionSession` exports, keep `Execution`.
- `packages/shared/domain/Realtime.ts` — drop `Orchestrator` import; `Realtime.Event` stays generic.
- `packages/shared/domain/Workbench.ts` — replace `Orchestrator.Job.Id` reference with `Execution.Id`.

### Create
- `packages/backend/src/services/Execution/execution.module.ts`
- `packages/backend/src/services/Execution/execution.controller.ts`
- `packages/backend/src/services/Execution/execution.service.ts`
- `packages/backend/src/services/Execution/utils.ts` — port `SecretsResolver` from `Orchestrator/utils.ts`.

> **Depends on `SPECS/ownership-service.md`** — `OwnershipService` (with `assertWorkflow`, `assertExecution`, `loadWorkflowOwner`) is assumed available via DI. Land that spec first or in the same change.
- `packages/frontend/src/routes/workflow/-SDKs/ExecutionSDK/sdk.tsx` — finish the existing stub; consolidates both old SDKs.
- `packages/frontend/src/routes/workflow/-SDKs/ExecutionSDK/actions.ts`
- `packages/frontend/src/routes/workflow/-SDKs/ExecutionSDK/reducers.ts`
- `packages/frontend/src/routes/workflow/-SDKs/ExecutionSDK/ui/WorkflowControls.tsx` — moved from `OrchestratorSDK`.

### Modify
- `packages/backend/src/app.module.ts` — register `ExecutionModule`, drop the two old modules.
- `packages/backend/src/services/Realtime/realtime.service.ts` — change typed waiters from `Orchestrator.Event` to `Execution.Event`. Terminal type set is unchanged: `{completed, failed, terminated}`.
- `packages/worker/src/worker.ts` — `Orchestrator.Job.Id` → `Execution.Id`; signal/event channels use the unified channel helpers; queue item shape comes from `Execution.Queue.Item`.
- `packages/worker/src/engine/index.ts` — `ExecutionSession.Event.*` → `Execution.Event.*`; `ExecutionSession.EdgeState` / `NodeStatus` → `Execution.Session.EdgeState` / `Execution.Session.NodeStatus`. Channel resolved via `Execution.Event.getChannel(executionId)`.
- `packages/worker/src/compiler/index.ts` — compile signature takes `executionId: Execution.Id` (replaces the old `jobId` + session-with-its-own-id pair).
- `packages/frontend/src/routes/workflow/$workflowid.tsx` — swap SDK imports.
- `packages/frontend/src/routes/workflow/-SDKs/ChatSDK/sdk.tsx` and `actions.tsx` — `OrchestratorSDK` + `ExecutionSessionSDK` calls → `ExecutionSDK`.
- `packages/frontend/src/routes/workflow/-SDKs/WorkbenchSDK/selectors.ts` — `ExecutionSession` type → `Execution.Session`.
- `packages/frontend/src/routes/workflow/-SDKs/WorkbenchSDK/ui/Canvas/Edge/index.tsx`
- `packages/frontend/src/routes/workflow/-SDKs/WorkbenchSDK/ui/Canvas/Node/index.tsx`
- `packages/frontend/src/routes/workflow/-SDKs/WorkbenchSDK/ui/Canvas/Node/StatusBorder.tsx`
- `packages/frontend/src/routes/workflow/-SDKs/WorkbenchSDK/ui/Canvas/Node/Header/index.tsx`
- `packages/frontend/src/routes/workflow/-SDKs/WorkbenchSDK/ui/Canvas/Node/Header/StatusIndicator.tsx`
- `packages/frontend/src/routes/workflow/-SDKs/WorkbenchSDK/ui/NodeSidebar/header.tsx`
- `packages/frontend/src/routes/workflow/-SDKs/WorkbenchSDK/ui/NodeSidebar/webhook-renderer.tsx`
- `packages/frontend/src/routes/workflow/-SDKs/WorkbenchSDK/ui/FieldRenderer/Condition/ExpressionInput.tsx`
- `packages/frontend/src/components/StateViewer.tsx`

### Database
- Drop `jobs` and `execution_sessions` tables (rows are empty per the user).
- Create one `executions` table — see "Database" below.
- Repoint FKs: `chats.execution_session_id` → `chats.execution_id`; `chat_messages.job_id` → `chat_messages.execution_id`.
- Drop the `get_session_metas` and `get_session_meta` RPCs — replaced by a straight `select` on `executions` (omitting the `data` column for meta queries).

## Domain Shape

There is no `Job` sub-namespace. Since Job and Session collapse into one entity, the entity *is* the `Execution`. The Zod-inferred top-level type is `Execution`. `Session` survives as a sub-namespace only because the embedded runtime-state blob has its own internal shape (NodeStatus, EdgeState, etc.) — but it has no id of its own.

```ts
// packages/shared/domain/Execution.ts

export namespace Execution {

  export const Id = z.string().brand("ExecutionId")
  export type Id = z.infer<typeof Id>

  export const Status = z.enum([
    "pending", "running", "paused", "suspended",
    "completed", "failed", "terminated"
  ])
  export type Status = z.infer<typeof Status>

  // The top-level entity. `Execution = z.infer<typeof Execution.Schema>` at the bottom.
  export const Schema = z.object({
    id:         Execution.Id,
    workflowId: Workflow.Id,
    userId:     Auth.User.Id,             // always = workflow owner, server-derived
    igniter:    Igniter.Schema,            // replaces the old `trigger`
    chatId:     Chat.Id.optional(),        // set iff igniter.variant === "chat_message"
    status:     Execution.Status,
    error:      SystemError.Schema.optional(),
    createdAt:  z.iso.datetime(),
    updatedAt:  z.iso.datetime(),
    duration:   z.number(),
    session:    Session.Schema,            // embedded, no separate id
  })

  // Lightweight projection for list views — drops the heavy session blob.
  export const Meta = Schema.omit({ session: true })
  export type Meta = z.infer<typeof Meta>

  export namespace Session {
    // No Id — session is identified by its execution's id.

    export namespace NodeStatus { /* unchanged from old ExecutionSession */ }
    export namespace EdgeState  { /* unchanged */ }

    export const Schema = z.object({
      node_output_instances:   z.record(Workflow.Node.Id, z.any()).default({}),
      node_output_projections: z.record(Workflow.Node.Id,
                                  z.record(Port.Output.Id, Projection.Schema)).default({}),
      node_status: z.record(Workflow.Node.Id, NodeStatus.Schema).default({}),
      edge_state:  z.record(Workflow.Edge.Id, EdgeState.Schema).default({}),
      messages:    z.array(z.custom<BaseMessage>(...)).default([]),
      metadata:    z.record(z.string(), z.any()).default({}),
    })
    export const Update = Schema.partial()
    export const createInitial = () => Schema.parse({})
  }
  export type Session = z.infer<typeof Session.Schema>

  export namespace Igniter {
    // Merged "what kicked it off" — replaces old Trigger + Igniter split.
    export const WorkbenchManual = z.object({ variant: z.literal("workbench_manual") })
    export const ChatMessage     = z.object({ variant: z.literal("chat_message"),
                                              messageId: Chat.Message.Id })
    export const Webhook         = z.object({ variant: z.literal("webhook"),
                                              nodeId:  Workflow.Node.Id,
                                              payload: z.object({
                                                method:  z.string(),
                                                path:    z.string(),
                                                headers: z.record(z.string(), z.unknown()),
                                                query:   z.record(z.string(), z.unknown()),
                                                body:    z.unknown(),
                                              }) })
    export const Scheduled       = z.object({ variant: z.literal("scheduled"),
                                              scheduleId: z.string().optional(),
                                              scheduledAt: z.iso.datetime() })
    // Added by the api-keys spec, not this one:
    // export const Sdk = z.object({ variant: z.literal("sdk"), inputs: z.record(...) })

    export const Schema = z.discriminatedUnion("variant",
      [WorkbenchManual, ChatMessage, Webhook, Scheduled])
  }
  export type Igniter = z.infer<typeof Igniter.Schema>

  export const EXECUTION_QUEUE_ID = 'workflow-execution'

  export namespace Queue {
    export const Item = z.object({
      executionId:  Execution.Id,
      workflowId:   Workflow.Id,
      workflowData: Workflow.Data.Schema,
      session:      Session.Schema,
      igniter:      Igniter.Schema,
    })
    export type Item = z.infer<typeof Item>
  }

  // ─── Unified events: lifecycle + per-node, one channel ────────────────────
  export namespace Event {
    export const Channel = Realtime.Channel.brand("ExecutionChannel")
    export const getChannel = (executionId: Execution.Id) =>
      `execution:${executionId}` as Channel

    const Base = Realtime.Event.Base.extend({
      executionId: Execution.Id,
      workflowId:  Workflow.Id,
      channel:     Channel,
    })

    // Lifecycle (was Orchestrator.Event.*)
    export const Started    = Base.extend({ type: z.literal('started') })
    export const Paused     = Base.extend({ type: z.literal('paused') })
    export const Resumed    = Base.extend({ type: z.literal('resumed') })
    export const Suspended  = Base.extend({ type: z.literal('suspended') })
    export const Terminated = Base.extend({ type: z.literal('terminated') })
    export const Completed  = Base.extend({ type: z.literal('completed'),
                                            result: z.string() })
    export const Failed     = Base.extend({ type: z.literal('failed'),
                                            error: SystemError.Schema })
    // Note: compilation:* events folded into `failed` with error.code per design call.

    // Progress (was ExecutionSession.Event.*)
    export const Update = Base.extend({ type: z.literal('update'),
                                        update: Session.Update })

    export namespace Node {
      export const Started   = Base.extend({ type: z.literal('node:started'),
                                             nodeId: Workflow.Node.Id,
                                             stateUpdate: Session.Update.optional() })
      export const Completed = Base.extend({ type: z.literal('node:completed'),
                                             nodeId: Workflow.Node.Id,
                                             output: z.unknown(),
                                             stateUpdate: Session.Update.optional() })
      export const Error     = Base.extend({ type: z.literal('node:error'),
                                             nodeId: Workflow.Node.Id,
                                             error: SystemError.Schema })
      export const Waiting   = Base.extend({ type: z.literal('node:waiting'),
                                             nodeId: Workflow.Node.Id,
                                             dependencyResolutionMap: z.record(Workflow.Node.Id, z.boolean()),
                                             totalDeps: z.number() })
    }

    export const Schema = z.discriminatedUnion("type", [
      Started, Paused, Resumed, Suspended, Terminated, Completed, Failed,
      Update, Node.Started, Node.Completed, Node.Error, Node.Waiting,
    ])
  }
  export type Event = z.infer<typeof Event.Schema>

  // ─── Unified signals, one channel ──────────────────────────────────────────
  export namespace Signal {
    export const Channel = Realtime.Channel.brand("ExecutionSignalChannel")
    export const getChannel = (executionId: Execution.Id) =>
      `execution:${executionId}:signal` as Channel

    const Base = Realtime.Signal.Base.extend({ executionId: Execution.Id })

    export const Terminate = Base.extend({ type: z.literal("terminate") })
    export const Pause     = Base.extend({ type: z.literal("pause") })
    export const Resume    = Base.extend({ type: z.literal("resume") })
    export const Suspend   = Base.extend({ type: z.literal("suspend") })
    export const Heartbeat = Base.extend({ type: z.literal("heartbeat") })

    export const Schema = z.discriminatedUnion("type",
      [Terminate, Pause, Resume, Suspend, Heartbeat])
  }
  export type Signal = z.infer<typeof Signal.Schema>

  // ─── HTTP API ──────────────────────────────────────────────────────────────
  export namespace API {
    // Mounted at /api/execution
    export namespace Run { /* workbench/chat path — body has workflowData */ }
    export namespace RunInternal { /* webhook/scheduled — same shape, internal guard */ }
    export namespace AwaitResult { /* GET /await-result/:executionId */ }
    export namespace Pause { /* POST /pause      { executionId } */ }
    export namespace Resume { /* POST /resume    { executionId } */ }
    export namespace Suspend { /* POST /suspend  { executionId } */ }
    export namespace Terminate { /* POST /terminate { executionId } */ }
    export namespace Heartbeat { /* POST /heartbeat { executionId } */ }
    export namespace Finalise { /* POST /finalise { executionId, status } */ }
    export namespace ListActive { /* admin */ }
    export namespace TerminateAll { /* admin */ }

    // Session CRUD (was ExecutionSession.API)
    export namespace Get  { /* { executionId } → Execution (with session) */ }
    export namespace Update { /* partial session update */ }
    export namespace Meta {
      export namespace List { /* { workflowId } → Execution.Meta[] */ }
      export namespace Get  { /* { executionId } → Execution.Meta */ }
    }
  }
}
export type Execution = z.infer<typeof Execution.Schema>
```

## Database

Drop `jobs` and `execution_sessions`. Create:

```sql
create table executions (
  id           uuid primary key default gen_random_uuid(),
  workflow_id  uuid not null references workflows(id) on delete cascade,
  user_id      uuid not null references users(id),
  igniter      jsonb not null,
  chat_id      uuid references chats(id),
  status       text not null,
  error        text,
  duration     numeric not null default 0,
  data         jsonb not null,         -- the Session blob
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index executions_workflow_id_idx on executions(workflow_id);
create index executions_user_id_idx     on executions(user_id);
create index executions_status_idx      on executions(status);
```

Repoint FKs:
```sql
alter table chats
  drop constraint chats_execution_session_id_fkey,
  drop column execution_session_id,
  add  column execution_id uuid references executions(id);

alter table chat_messages
  drop constraint chat_messages_job_id_fkey,
  drop column job_id,
  add  column execution_id uuid references executions(id);
```

Drop the `get_session_metas` / `get_session_meta` RPCs — list/get queries become straight selects on `executions` (omit `data` for meta queries).

RLS on `executions`: standard owner-scoped (`select`/`update` where `user_id = auth.uid()`); the auth guards are responsible for setting `user_id` on insert.

## Realtime Channel Collapse

- Single event channel per execution: `execution:<executionId>`. Carries lifecycle + per-node events.
- Single signal channel per execution: `execution:<executionId>:signal`.
- Frontend SDK subscribes once per running execution and routes by `event.type`. The `OrchestratorSDK.subscribeToJob` + `ExecutionSessionSDK.subscribeToEvents` two-channel dance is gone.
- Backend `RealtimeService.withTerminalEvent` / `withEventConfirmation` keep their shapes; only the typed event union changes.

## Authorization

Owner-gating is delegated to **`OwnershipService`** — see `SPECS/ownership-service.md` for the service shape, rationale, and module wiring. This spec assumes the service is already provided globally and injectable into `ExecutionService` via `constructor(private readonly ownership: OwnershipService)`.

Methods used by this spec: `ownership.assertWorkflow`, `ownership.assertExecution`, `ownership.loadWorkflowOwner`.

## Security Fixes (in scope)

1. **Ownership check on every control endpoint** (`pause`, `resume`, `terminate`, `suspend`, `heartbeat`). Current code only checks ownership in `awaitResult`. The other endpoints fire the Redis signal regardless of caller — so any authenticated user who knows an `executionId` can pause/terminate a stranger's execution. Fix: call `await ownership.assertExecution(supabase, executionId, requester.userId)` at the top of each control handler. (Also retrofit `awaitResult` to use the service for consistency — its current inline check leaks via the wrong error code.)

2. **`Execution.userId` is the workflow owner, derived server-side, never trusted from the body.** Today, `Job.userId` is set to `requester.userId` for user runs and `undefined` for service runs. Both are wrong:
   - `runFromUser`: `Execution.userId = await ownership.assertWorkflow(supabase, workflowId, requester.userId)`. The method both gates the run (refuses if requester doesn't own the workflow) **and** returns the owner id for the new row in one call.
   - `runFromService` (webhook/scheduled): `Execution.userId = await ownership.loadWorkflowOwner(workflowId)` — service-triggered runs finally get owner attribution instead of `undefined`.
   The request body never carries a `userId` field on any path.

3. **Workflow ownership assertion on `run`.** Subsumed by (2): `ownership.assertWorkflow` is the same call that both gates the run and resolves the owner id. The cross-user credential leak was already blocked by RLS on `secrets` / `user_credentials` going through the authenticated supabase client (preserve this — do not switch `SecretsResolver` to the service client). Workbench/chat continue to ship draft `workflowData` from the body because they *are* the editor — the ownership check is on `workflowId`, not on the data shape.

Out of scope (separate specs): per-webhook-node `triggerAuthorizationKey`, scheduled-trigger ownership/scheduling system, API keys for the SDK (see `SPECS/api-keys.md`).

## Implementation Order

1. **Domain.** ✅ done
   - ✅ `packages/shared/domain/Execution.ts` — rewritten. `Job` removed; `Execution` is now the top-level entity with `Session` embedded, `Igniter` flat, unified `Event` + `Signal` channels.
   - ✅ `packages/shared/domain/Realtime.ts` — dead `Orchestrator` import removed.
   - ✅ `packages/shared/domain/ApiKey.ts` — created (from `api-keys.md` step 1, absorbed here since it adds `Igniter.Sdk`).
   - ✅ `packages/shared/domain/index.ts` — `ApiKey` export added.
   - ⬜ `packages/shared/domain/index.ts` — drop `Orchestrator` / `ExecutionSession` / `ExecutionIgniter` exports (blocked until backend + frontend consumers are migrated).
   - ⬜ `packages/shared/domain/Workbench.ts` — replace `Orchestrator.Job.Id` reference with `Execution.Id`.
   - ✅ Compile-check passes.

2. **Worker.** Migrate `worker.ts`, `engine/index.ts`, `compiler/index.ts` to the new domain. Single channel for events. Compile signature takes `executionId` (was `jobId` + separate session id).
3. **Backend.** Build `services/Execution/` (module, controller, service, utils). Mount in `app.module.ts`. Migrate `RealtimeService` types. Delete `Orchestrator/` and `ExecutionSession/` directories. Apply the security fixes (ownership checks, server-derived userId).
4. **Database.** Apply the migration: drop old tables, create `executions`, repoint FKs, drop RPCs.
5. **Frontend.** Finish `ExecutionSDK/` (sdk + actions + reducers). Move `SessionSelector` and `WorkflowControls` into its `ui/` subfolder. Migrate every consumer (~12 files). Delete `OrchestratorSDK/` and `ExecutionSessionSDK/` directories.
6. **Smoke test.** Workbench manual run; chat-driven run; pause + resume + terminate; another user's `executionId` returns 404 from each control endpoint; session UI still renders node/edge state live.

## Open Questions

None blocking. The following are deferred to follow-up specs and intentionally not addressed here:

- Per-webhook-node authorization keys.
- Scheduled trigger system (cron registration, ownership at schedule-creation time).
- API keys for external SDK clients (see `SPECS/api-keys.md`).
- `Execution.Meta` truncation strategy if executions ever grow large enough that `select id, …, data` for the dashboard becomes a perf concern (not a problem at current scale).
