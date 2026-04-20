# Webhook Trigger System

## Motivation

Enable workflows to be triggered by external HTTP events. A dedicated webhook server receives inbound requests, maps them to published workflows via an in-memory registry, and invokes the standard orchestrator execution path.

Publishing is decoupled from drafts via a `version_control` table — each publish is an immutable deep-copy snapshot, so editing a workflow never changes live webhook behavior and prior versions can be reverted to by flipping a flag.

---

## Architecture Overview

```
External service
  → POST /webhooks/:path
  → Webhook Server (port 3002)
      → look up path in in-memory registry
      → POST /api/orchestrator/run-internal  (x-internal-token)
  → Backend OrchestratorService
      → validate + enqueue to workflow-execution queue
  → Worker
      → Webhook node outputs { body, headers, query, params }
      → rest of workflow executes normally
```

### Version Control Model

- `workflows` table — the editable draft. Always mutable.
- `version_control` table — immutable snapshots. Each publish inserts a new row with `version = max+1` and full `data` deep copy of the draft.
- Only one row per `workflow_id` may have `is_active = true` (enforced by partial unique index).
- **Publish** = insert new active row, flip previous active row to `is_active = false`.
- **Revert** = flip `is_active` flags between rows. No data copy required.
- **Webhook server** reads only from `version_control WHERE is_active = true` — drafts never reach production.

### In-Memory Registry Lifecycle

```
Boot
  → query Supabase: version_control WHERE is_active = true
  → filter: snapshot's data.nodes has at least one with blueprintId "Core.Webhook"
  → build Map<webhookPath, { workflow: Workflow, ownerId: Auth.User.Id }>

Runtime
  → Redis sub channel "webhook:workflow:published"   → upsert entry (fetch new active snapshot)
  → Redis sub channel "webhook:workflow:unpublished" → remove entry

Request arrives at POST /webhooks/:path
  → map.get(path) → not found → 404
  → found → call run-internal → return 200 immediately
```

---

## Affected Files

| File | Change |
|---|---|
| `supabase/migrations/` | New — create `version_control` table |
| `packages/shared/domain/VersionControl.ts` | New — Zod schema for published snapshots |
| `packages/shared/constants/drawers.ts` | Register `Core.Webhook` in `CORE_DRAWERS.input_output` |
| `packages/worker/src/nodes/Core/Webhook/blueprint.ts` | ✅ Exists — generic Webhook node blueprint |
| `packages/worker/src/nodes/Core/Webhook/node.ts` | ✅ Exists — reads `session.metadata.webhookPayload` |
| `packages/backend/src/services/Orchestrator/orchestrator.controller.ts` | Add `POST run-internal` endpoint |
| `packages/backend/src/services/Orchestrator/orchestrator.service.ts` | Add `runInternal()` method |
| `packages/backend/src/services/Library/library.service.ts` | Add `publish()` / `unpublish()` / `revert()` methods |
| `packages/backend/src/services/Library/library.controller.ts` | Add publish/unpublish/revert routes |
| `packages/webhook/src/services/Webhook/webhook.service.ts` | Replace queue logic with registry + run-internal call |
| `packages/webhook/src/services/Webhook/webhook.controller.ts` | Route by path, return 200 immediately |
| `packages/webhook/src/services/Webhook/webhook.module.ts` | Wire up registry service |
| `packages/webhook/src/registry/webhook-registry.service.ts` | New — in-memory map + Redis subscriber |

---

## Implementation Steps

### 1. DB Migration

```sql
CREATE TABLE version_control (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id     uuid NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES users(id),
  version         int NOT NULL,
  data            jsonb NOT NULL,
  display_name    text,
  published_at    timestamptz NOT NULL DEFAULT now(),
  is_active       boolean NOT NULL DEFAULT true,
  UNIQUE (workflow_id, version)
);

CREATE UNIQUE INDEX one_active_per_workflow
  ON version_control (workflow_id)
  WHERE is_active = true;
```

### 2. Webhook Node (already implemented)
`Core.Webhook` blueprint and runtime already exist. Contract the webhook server must respect:
- Fields: `path` (unique string, user-defined identifier), `method` (GET/POST/PUT/PATCH/DELETE)
- Outputs: `body`, `headers`, `query`, `params`
- The node reads `session.metadata.webhookPayload` which must contain `{ body, headers, query, params, method }`
- If `payload.method` is set and mismatches the configured `method` field, the node throws — so the webhook server should always pass `method` in the payload

### 3. Register in Drawers (`packages/shared/constants/drawers.ts`)
Add `"Core.Webhook"` to `CORE_DRAWERS.input_output`.

### 4. `run-internal` Endpoint (Backend)

**Controller** — `POST /api/orchestrator/run-internal`, protected by `InternalAuthGuard`:
```typescript
@Post('run-internal')
@UseGuards(InternalAuthGuard)
@HttpCode(200)
async runInternal(@Body() body: any) {
    const payload = Orchestrator.API.RunInternal.Request.parse(body);
    return this.orchestratorService.runInternal(payload);
}
```

**New shared type** `Orchestrator.API.RunInternal.Request`:
```typescript
z.object({
    workflow:       Workflow.Schema,
    ownerId:        Auth.User.Id,
    webhookPayload: z.object({
        method:  z.string(),
        body:    z.unknown(),
        headers: z.record(z.string()),
        query:   z.record(z.string()),
        params:  z.record(z.string()),
    }),
})
```

**Service** — `runInternal()`:
- Uses `createServiceClient()` (no user token needed)
- Auto-generates `executionSession`:
  ```typescript
  const executionSession = ExecutionSession.Schema.parse({
      chatId: createId() as Chat.Id,
      metadata: { webhookPayload: payload.webhookPayload, trigger: 'webhook' },
  });
  ```
- Runs standard validation + enqueue path (same as `run()`, minus the user-auth Supabase calls)
- Does **not** wait for worker confirmation (fire-and-forget) — webhook server already returned 200

### 5. Publish / Unpublish / Revert (Backend Library)

**New routes** (behind `SupabaseAuthGuard`):
- `POST /api/library/workflows/:id/publish` — snapshot the current draft as a new active version
- `POST /api/library/workflows/:id/unpublish` — set current active row `is_active = false` (no active version remains)
- `POST /api/library/workflows/:id/revert/:version` — flip `is_active` back to a specific older version

**Publish flow (in a DB transaction):**
1. `SELECT COALESCE(MAX(version), 0) + 1 FROM version_control WHERE workflow_id = $1`
2. `UPDATE version_control SET is_active = false WHERE workflow_id = $1 AND is_active = true`
3. `INSERT INTO version_control (workflow_id, user_id, version, data, display_name) VALUES (...)` with `is_active = true`
4. Emit Redis event `webhook:workflow:published` with `{ workflowId }`

**Unpublish:** `UPDATE … SET is_active = false WHERE workflow_id = $1` + Redis event `webhook:workflow:unpublished`.

**Revert:** transactional flip — deactivate current active, activate the target version, emit `webhook:workflow:published`.

Redis publisher uses `ioredis` (already a dependency).

### 6. Webhook Registry Service (`packages/webhook/src/registry/webhook-registry.service.ts`)

```typescript
@Injectable()
export class WebhookRegistryService implements OnModuleInit {
    private readonly map = new Map<string, { workflow: Workflow; ownerId: Auth.User.Id }>();

    async onModuleInit() {
        await this.loadAll();
        this.subscribeToRedis();
    }

    private async loadAll() {
        // service client → SELECT * FROM version_control WHERE is_active = true
        // for each row: parse data → find Webhook nodes → for each: map.set(node.fields.path, { workflow, ownerId: row.user_id })
    }

    private subscribeToRedis() {
        // ioredis subscriber
        // on "webhook:workflow:published"   → fetch active snapshot for workflowId → upsert entries for each webhook node path
        // on "webhook:workflow:unpublished" → remove all entries whose workflow.id === workflowId
    }

    resolve(path: string) {
        return this.map.get(path) ?? null;
    }
}
```

### 7. Webhook Controller (Updated)

```typescript
@Post(':path(*)')
@HttpCode(200)
async receive(@Param('path') path: string, @Req() req: WebhookRequest) {
    const entry = this.registry.resolve(path);
    if (!entry) throw new NotFoundException(`No workflow registered at path: ${path}`);

    await this.webhookService.handle(entry, {
        method:  req.method,
        body:    req.body,
        headers: req.headers as Record<string, string>,
        query:   req.query   as Record<string, string>,
        params:  req.params,
    });

    return { received: true };
}
```

`WebhookService.handle()` calls `POST /api/orchestrator/run-internal` via axios with `x-internal-token` header.

---

## Open Questions

1. **Response mode** — for now webhook always returns `200 { received: true }` immediately. A future "wait for result" mode would require the webhook server to poll `await-result` and hold the connection open.
2. **Multiple Webhook nodes** — a single workflow snapshot can have multiple Webhook nodes with different paths. The registry handles this by registering each path → same `{ workflow, ownerId }` entry. Confirmed intentional.
3. **Optional per-node auth** — generic endpoints are public by default (n8n-style). Future extension: add auth fields to the Webhook node blueprint (None / Header Auth / Basic Auth).
4. **Stale registry on boot** — if Supabase is unreachable at boot, `loadAll()` currently has no retry. Decision: crash vs start-with-empty-map vs exponential backoff retry.
5. **Method routing** — the Webhook node has a `method` field, but the webhook server currently accepts only `POST /webhooks/:path`. Do we need to add other method handlers, or rely on the node's runtime method check?
6. **Draft cleanup on workflow delete** — `ON DELETE CASCADE` on `workflow_id` means deleting a workflow wipes its entire version history. Intentional or do we want to soft-delete to preserve audit trail?
