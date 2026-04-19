# Webhook Trigger System

## Motivation

Enable workflows to be triggered by external HTTP events (Stripe payments, GitHub pushes, Zapier, custom integrations, etc.) without requiring a user session. A dedicated webhook server receives inbound requests, maps them to published workflows via an in-memory registry, and invokes the standard orchestrator execution path.

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

### In-Memory Registry Lifecycle

```
Boot
  → query Supabase: workflows WHERE published = true
  → filter: has at least one node with blueprintId "Core.Webhook"
  → build Map<webhookPath, { workflow: Workflow, ownerId: Auth.User.Id }>

Runtime
  → Redis sub channel "webhook:workflow:published"   → upsert entry
  → Redis sub channel "webhook:workflow:unpublished" → delete entry

Request arrives at POST /webhooks/:path
  → map.get(path) → not found → 404
  → found → call run-internal → return 200 immediately
```

---

## Affected Files

| File | Change |
|---|---|
| `packages/shared/domain/Workflow.ts` | Add `published: boolean` field |
| `packages/shared/constants/drawers.ts` | Register `Core.Webhook` in `CORE_DRAWERS.input_output` |
| `packages/worker/src/nodes/Core/Webhook/blueprint.ts` | New — Webhook node blueprint |
| `packages/worker/src/nodes/Core/Webhook/node.ts` | New — Webhook node execution |
| `packages/worker/src/node_index.json` | Register new node (via `npm run generate-indexes`) |
| `packages/backend/src/services/Orchestrator/orchestrator.controller.ts` | Add `POST run-internal` endpoint |
| `packages/backend/src/services/Orchestrator/orchestrator.service.ts` | Add `runInternal()` method |
| `packages/backend/src/services/Library/library.service.ts` | Add `publish()` / `unpublish()` methods |
| `packages/backend/src/services/Library/library.controller.ts` | Add publish/unpublish routes |
| `packages/webhook/src/services/Webhook/webhook.service.ts` | Replace queue logic with registry + run-internal call |
| `packages/webhook/src/services/Webhook/webhook.controller.ts` | Route by path, return 200 immediately |
| `packages/webhook/src/services/Webhook/webhook.module.ts` | Wire up registry service |
| `packages/webhook/src/registry/webhook-registry.service.ts` | New — in-memory map + Redis subscriber |
| `supabase/migrations/` | New — add `published` column to `workflows` table |

---

## Implementation Steps

### 1. DB Migration
Add `published boolean NOT NULL DEFAULT false` to the `workflows` table.

### 2. Workflow Domain (`packages/shared/domain/Workflow.ts`)
Add to `Workflow.Schema`:
```typescript
published: z.boolean().default(false),
```

### 3. Webhook Node Blueprint (`packages/worker/src/nodes/Core/Webhook/blueprint.ts`)
```typescript
export const Blueprint = defineBlueprint({
    id: "Core.Webhook",
    displayName: "Webhook",
    description: "Starts the workflow when an inbound HTTP request arrives at the configured path.",
    icon: "Webhook",
    accent: "trigger",
    fields: [
        FieldBuilder.String({
            id: "path",
            displayName: "Path",
            initialValue: "",
            tooltip: "URL suffix that identifies this webhook. e.g. my-workflow → POST /webhooks/my-workflow",
        }),
        FieldBuilder.Select({
            id: "method",
            displayName: "HTTP Method",
            initialValue: "POST",
            options: ["GET", "POST", "PUT", "PATCH", "DELETE"],
        }),
    ],
    inputs: [],  // trigger node — no inputs
    outputs: [
        OutputBuilder.Data({ id: "body",    displayName: "Body" }),
        OutputBuilder.Data({ id: "headers", displayName: "Headers" }),
        OutputBuilder.Data({ id: "query",   displayName: "Query Params" }),
        OutputBuilder.Data({ id: "params",  displayName: "Path Params" }),
    ],
});
```

### 4. Webhook Node Execution (`packages/worker/src/nodes/Core/Webhook/node.ts`)
The node reads the request data injected into `executionSession.metadata.webhookPayload` by the orchestrator, and emits it on output ports:
```typescript
execute(context) {
    const payload = context.session.metadata['webhookPayload'] ?? {};
    context.output('body',    payload.body    ?? null);
    context.output('headers', payload.headers ?? {});
    context.output('query',   payload.query   ?? {});
    context.output('params',  payload.params  ?? {});
}
```

### 5. Register in Drawers (`packages/shared/constants/drawers.ts`)
Add `"Core.Webhook"` to `CORE_DRAWERS.input_output`.

### 6. `run-internal` Endpoint (Backend)

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
- Injects `webhookPayload` into session metadata
- Runs standard validation + enqueue path (same as `run()`, minus the user-auth Supabase calls)
- Does **not** wait for worker confirmation (fire-and-forget) — webhook server already returned 200

### 7. Publish / Unpublish (Backend Library)

**New routes:**
- `POST /api/library/workflows/:id/publish`
- `POST /api/library/workflows/:id/unpublish`

Both behind `SupabaseAuthGuard`. Service:
1. Update `published` column in Supabase
2. Publish Redis event on channel `webhook:workflow:published` / `webhook:workflow:unpublished` with `{ workflowId }`

Redis publisher uses `ioredis` (already a dependency).

### 8. Webhook Registry Service (`packages/webhook/src/registry/webhook-registry.service.ts`)

```typescript
@Injectable()
export class WebhookRegistryService implements OnModuleInit {
    private readonly map = new Map<string, { workflow: Workflow; ownerId: Auth.User.Id }>();

    async onModuleInit() {
        await this.loadAll();
        this.subscribeToRedis();
    }

    private async loadAll() {
        // query Supabase service client: workflows WHERE published = true
        // filter: has node with blueprintId "Core.Webhook"
        // for each: extract path field → map.set(path, { workflow, ownerId })
    }

    private subscribeToRedis() {
        // ioredis subscriber
        // on "webhook:workflow:published"   → fetch that workflow → upsert into map
        // on "webhook:workflow:unpublished" → remove from map
    }

    resolve(path: string) {
        return this.map.get(path) ?? null;
    }
}
```

### 9. Webhook Controller (Updated)

```typescript
@Post(':path(*)')
@HttpCode(200)
async receive(@Param('path') path: string, @Req() req: WebhookRequest) {
    const entry = this.registry.resolve(path);
    if (!entry) throw new NotFoundException(`No workflow registered at path: ${path}`);

    await this.webhookService.handle(entry, {
        body:    req.body,
        headers: req.headers as Record<string, string>,
        query:   req.query   as Record<string, string>,
        params:  req.params,
    });

    return { received: true };
}
```

`WebhookService.handle()` calls `POST /api/orchestrator/run-internal` via `HttpService` (axios) with `x-internal-token` header.

---

## Open Questions

1. **Response mode** — for now webhook always returns `200 { received: true }` immediately. A future "wait for result" mode would require the webhook server to poll `await-result` and hold the connection open.
2. **Multiple Webhook nodes** — what if a workflow has two Webhook nodes with different paths? Currently the registry would register both paths pointing to the same workflow. Is that intentional?
3. **Auth on webhook endpoints** — HMAC guard is stubbed as passthrough. Which providers need signature verification first?
4. **`ownerId` source** — the registry needs the workflow owner's `userId` to pass to `runInternal`. This should come from the `workflows` table (add `user_id` to the Supabase query at boot).
5. **Stale registry on boot** — if the webhook server restarts while the backend is down, `loadAll()` fails silently. Should it retry, crash, or start with an empty map?
