# Node SDK — Creating Nodes

`@pretzel-graph/node-sdk` is the toolkit for authoring nodes. A node is two files:

- **`blueprint.ts`** — declares the node's identity, fields, input/output ports, and credentials (the *shape*, used by the editor and the type system).
- **`node.ts`** — the `RuntimeNode` subclass that *executes* (the *behavior*, run by the worker).

Conditional fields and ports are declared directly in `blueprint.ts` as derivatives.

Nodes are resolved by a **blueprint-id → path convention**. Blueprint id `Integrations.Postgres.Query` lives at `packages/nodes/src/Integrations/Postgres/Query/{blueprint,node}.ts`. There is no central registry import — `CatalogueService` dynamic-imports by path.

Everything a blueprint declares is built with a `define*` helper:

| Helper | Declares |
|---|---|
| `defineBlueprint` / `defineTool` | a node / its tool form |
| `defineField.*` | a config field |
| `defineInput.*` / `defineOutput.*` | an input / output port |
| `defineCredential` / `defineOAuth2Credential` | a credential template |
| `defineWebhook` | an inbound webhook |
| `defineLoaders` | ResourceLoader data sources |

---

## Quick start — a minimal node

```ts
// packages/nodes/src/Integrations/Acme/Hello/blueprint.ts
import { defineBlueprint, defineField, defineInput, defineOutput } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Integrations.Acme.Hello",
    displayName: "Hello",
    description: "Greets the incoming name.",
    icon: "Acme",                // SystemIcons or integrations name
    accent: "utility",
    fields: [
        defineField.String("greeting", "Greeting", { initialValue: "Hello" }),
    ],
    inputs:  [ defineInput.Text("name", "Name", { required: true }) ],
    outputs: [ defineOutput.Text("message", "Message") ],
});
```

```ts
// packages/nodes/src/Integrations/Acme/Hello/node.ts
import { RuntimeNode, InferIncoming, InferOutputs } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";

export class Node extends RuntimeNode<typeof Blueprint> {
    public readonly Blueprint = Blueprint;

    protected override async onRun(
        incoming: InferIncoming<typeof Blueprint>,
    ): Promise<InferOutputs<typeof Blueprint>> {
        return { message: `${this.fieldValues.greeting}, ${incoming.name}!` };
    }
}
```

Then the **three wiring steps** (see the checklist at the bottom):
1. Register the blueprint id in a drawer in `packages/shared/constants/drawers.ts`.
2. If it has a credential, define it under `Credentials/` and export from `Credentials/index.ts`.
3. Run `npm run generate-indexes` in `packages/nodes`.

---

## `defineBlueprint(config)`

| Field | Type | Notes |
|---|---|---|
| `id` | string | Dotted blueprint id; **must** match the folder path. Branded `Blueprint.Id`. |
| `displayName` | string | Shown on the node header. |
| `description` | string | Shown in the shelf / tooltip. |
| `icon` | string | A `SystemIcons` (Lucide-style) or `integrations` name. Unknown names render nothing. |
| `accent` | string? | Header accent, e.g. `"utility"` or a `"port-<Type>"` color. |
| `fields` | `defineField.*[]` | Static config inputs (the form). |
| `inputs` | `defineInput.*[]` | Typed input ports (left side). |
| `outputs` | `defineOutput.*[]` | Typed output ports (right side). |
| `credentials` | `CredentialTemplate[]?` | Credential templates this node uses. |
| `webhooks` | `defineWebhook(...)[]?` | Inbound webhook definitions. |
| `toolCompatible` | boolean? | If true, the node can also be built as a LangChain tool (`onBuildTool`). |
| `flags` | record? | Arbitrary node-level flags. |

`defineBlueprint` also appends the standard `signalDependency` / `dataDependency` / `onErrorStrategy` fields, plus a hidden tool field when `toolCompatible`. They are exported as `StandardFields`; `StandardFields.IDS` holds their ids.

---

## Fields — `defineField.*`

Fields are the node's **static config form**. Every builder takes `(id, displayName, options)`:

```ts
defineField.Integer("maxResults", "Max Results", { initialValue: 20, min: 1, max: 100 })
```

Shared options: `required?`, `advanced?`, `hidden?`, `tooltip?`, `itemScoped?`. Most builders also take `initialValue?`, `isExpressionInitially?` (start in expression mode) and `only?: "static" | "expression"` (lock the mode).

Do not set `reconcile` manually. `defineBlueprint` marks fields used by derivative conditions so the editor knows when to resolve a new derivative.

| Builder | Value type | Notes |
|---|---|---|
| `String` | string | `multiline?` for a textarea; `placeholder?` |
| `UniqueString` | string | generated per node; `prefix?` `length?` |
| `Integer` / `Float` | number | `min?` `max?` `step?` `slider?` |
| `Boolean` | boolean | renders a switch/checkbox |
| `MultiOption` | option value | `options: [{ value, displayName?, description? }]`, `variant?: "select" \| "tab"`; `initialValue` required |
| `Json` | any JSON | stores a **parsed** object (not a string) |
| `Script` | string | code/SQL editor |
| `Password` / `Secret` | string | masked input |
| `File` | file ref | `fileTypes?` |
| `List` | string[] | |
| `CalendarRange` / `CalendarDateTimeRange` | date range | `placeholder?` |
| `WorkflowIdSelector` | workflow id | picks a workflow from the library |
| `CaseList` / `Condition` / `Variadic` | — | routing / branching constructs |
| `ResourceLoader` | `{ mode, value }` | dynamic dropdown backed by a loader — see below |

`defineField.itemScoped(field)` marks an existing field as item-scoped, the same as passing `itemScoped: true`.

Read field values at runtime via **`this.fieldValues.<id>`** (typed by `InferFieldValues`).

---

## Ports — `defineInput.*` / `defineOutput.*`

Ports are **typed connections** between nodes. The variant determines connection compatibility, the port color, and (for lists) fan-out semantics. Every builder takes `(id, displayName, options?)`:

```ts
defineInput.Data("payload", "Payload", { required: true })
defineOutput.DataList("rows", "Rows")
```

Input options: `required?`, `tooltip?`, `placeholder?`, `groupId?`, `internal?`. Output options: `tooltip?`, `groupId?`, `internal?`.

| Variant | Meaning |
|---|---|
| `Message` / `MessageList` | LangChain chat message(s) |
| `Text` | plain string |
| `Data` | **a single item** — a plain object or scalar |
| `DataList` | **an array of items** — fans out downstream (the batch-array model) |
| `DataFrame` *(output)* | tabular data |
| `Document` / `Retriever` / `Embeddings` / `VectorStore` | LangChain RAG handles |
| `LanguageModel` | a chat model handle |
| `Tool` / `ToolList` | LangChain tool(s) |
| `Unresolved` / `UnresolvedScalar` / `UnresolvedList` | polymorphic ports (`polymorphicGroupId`) resolved at wire time |

**Choosing Data vs DataList:** one value → `Data`; a collection that should fan out per-item → `DataList`. (A SQL query's rows = `DataList`; a single summary object = `Data`.)

Read input values in `onRun` via the `incoming` argument (typed by `InferIncoming`); return outputs as `{ <outputId>: value }` (typed by `InferOutputs`).

---

## Credentials — `defineCredential` + `credentials: [...]`

```ts
// packages/nodes/src/Credentials/Acme.ts
import { defineCredential, defineField } from "@pretzel-graph/node-sdk";
export const Acme = defineCredential({
    id: "acmeApi",
    displayName: "Acme",
    icon: "Acme",
    fields: [ defineField.Password("apiKey", "API Key", { required: true }) ],
});
```

Declare it on the blueprint (`credentials: [Acme]`), then read it at runtime:

```ts
const { apiKey } = this.context.credentialsAPI.getDecryptedValue(this.credentials.acmeApi.blob);
```

Credential field values are **type-preserving** (`Vault.DecryptedValues` is a union) — an `Integer` field decrypts to a `number`, a `Boolean` to a `boolean`. `getDecryptedValue` returns those types via `InferCredentialValues`. Re-export every credential from `Credentials/index.ts`.

---

## The `RuntimeNode` class

Subclass `RuntimeNode<typeof Blueprint>` (optionally `<typeof Blueprint, typeof ToolBlueprint>`). Override the lifecycle hooks you need — only `onRun` is required.

| Hook | When | Returns |
|---|---|---|
| `onRun(incoming)` *(required)* | normal execution | `Partial<InferOutputs>` |
| `onWait(incoming)` | node is waiting on partial inputs | — |
| `onCompile(ctx)` | once, at graph compile time | — |
| `onIgniter(igniter)` | a trigger fires the node | — |
| `onWebhook(payload)` | an inbound webhook arrives | — |
| `onBuildTool(incoming)` | node is converted to a LangChain tool (`toolCompatible`) | tool output |
| `onRecordMetrics({inputs,outputs,unitId,status,duration})` | after a run, to record metrics | `Record<id, Metric>` |

Class-level controls:
- `public readonly IS_PASSIVE = true` — exclude from automatic `__START__` wiring; the node only fires when explicitly triggered.
- `getPropagationStrategy()` → `"router"` (default; only ports present in the result) / `"all"` (every downstream dependent) / `"none"` (node handled propagation itself).
- `static loaders = defineLoaders<typeof Blueprint>()({ ... })` — ResourceLoader data sources (see below).

Inside a node you have:
- `this.fieldValues` — evaluated field values (`InferFieldValues`).
- `this.credentials` — credential instances (`InferCredentials`).
- `this.emit(event)` — emit a realtime event.
- `this.context` — the `ExecutionContext` (APIs below).

### `this.context` — ExecutionContext APIs

| API | Purpose |
|---|---|
| `credentialsAPI` | `getInstance(id)`, `getDecryptedValue(blob)` |
| `portAPI.write(nodeId, outputId, value)` | imperatively write an output port |
| `propagationAPI.emitPort/emitNode` | fan out a signal manually |
| `schedulerAPI` | `fireNode`, `signalNode`, `removeSignal`, `clearSignals`, `scheduleCheck` |
| `instanceRegistryAPI` | `get(nodeId)` / `getAll()` running node instances |
| `workflowQueryAPI` | `getNodesByBlueprint(id)`, `getNodeOutput(nodeId, portId)` |
| `abortAPI` | `signal`, `abort(reason)` |
| `agentToolBridgeAPI` | bind live `Tool` values to a short-lived, authenticated MCP endpoint for an external agent process |
| `subWorkflowAPI` | compile + run a nested workflow |
| `dependencyAPI` | resolve published/draft workflow dependencies |
| `workflowData` / `workflowId` / `workflowCache` / `session` / `updateSession` | execution state |

Helpers on the base class:
- `this.AbortablePromise((resolve, reject, signal) => …)` — a promise that rejects on abort.

Realtime, via `this.context.realtimeAPI`:
- `this.context.realtimeAPI.emit(event)` — publish an event (engine → user).
- `this.context.realtimeAPI.awaitSignal(channel, schema, timeout)` — wait for a Redis pub/sub signal (used by human-in-the-loop / wait patterns). Bound to the execution's abort signal, so it rejects + cleans up on terminate/suspend.

---

## Type inference

All derived from `typeof Blueprint` (the static blueprint), keyed by field/port literal id:

- `InferFieldValues<B>` — `this.fieldValues` shape
- `InferIncoming<B>` — `onRun` argument
- `InferOutputs<B>` — `onRun` return
- `InferCredentials<B>` — `this.credentials` shape
- `InferCredentialValues<T>` — decrypted credential values

---

## ResourceLoader fields + `defineLoaders`

A `ResourceLoader` field is a dynamic dropdown whose options come from a **loader** — a function on the node that fetches at edit time (e.g. list DB tables). Loaders run in the backend with the node's credentials injected.

```ts
static loaders = defineLoaders<typeof Blueprint>()({
    async schemaSearch({ credentials, credentialsAPI, fieldValues, searchQuery }) {
        const creds = toPgCreds(credentialsAPI.getDecryptedValue(credentials.postgres.blob));
        const rows = await postgres.withConnection(creds, c =>
            c.query("SELECT schema_name FROM information_schema.schemata"));
        return { options: rows.rows.map(r => ({ label: r.schema_name, value: r.schema_name })) };
    },
});
```

`LoaderContext` gives `fieldValues` (typed `InferFieldValues`), `credentials` + `credentialsAPI` (same as execution), `searchQuery`, `paginationCursor`. A field declares `loaderId: "schemaSearch"` and may declare `dependsOn: ["otherField"]` so changing the dependency re-fetches:

```ts
defineField.ResourceLoader("table", "Table", { loaderId: "tableSearch", dependsOn: ["schema"] })
```

---

## Inline derivatives — operation-driven schemas

Add condition keys to the object passed to `defineBlueprint`. A matching branch contributes fields, inputs, outputs, credentials, or UI overrides to the resolved blueprint. Conditions can nest, and `InferFieldValues` narrows the resulting runtime values without casts.

```ts
export const Blueprint = defineBlueprint({
    id: "Integrations.Acme.Database",
    displayName: "Acme Database",
    description: "Reads and writes values.",
    icon: "Database",
    fields: [
        defineField.MultiOption("operation", "Operation", {
            options: [
                { value: "GET", displayName: "Get" },
                { value: "SET", displayName: "Set" },
            ],
            initialValue: "GET",
        }),
        defineField.String("key", "Key", { required: true }),
    ],
    inputs: [],
    outputs: [defineOutput.Data("result", "Result")],

    "operation==GET": {},
    "operation==SET": {
        fields: [defineField.String("value", "Value")],
    },
});
```

Use `field==value` or `field!=value`. Branch members are additive by default; use `replaces` when a branch must replace an existing member. The compiler validates condition fields and option values when the blueprint module loads, stamps condition fields as derivative triggers, and serializes the branches into `_derivatives`. Runtime and Shelf resolution use only this serialized derivative tree.

---

## Database connection layer (`src/db/`)

For DB-backed nodes, the SDK provides pooled connection managers so loaders and execution reuse warm connections (keyed by a hash of the decrypted credentials, with a TTL reaper).

- `ConnectionManager<TCreds, TClient>` — base: cache + value-hash key + reap. Override `createClient` / `disposeClient`. Use directly for driver-pooled clients (Redis, Mongo).
- `SqlConnectionManager` — adds `withConnection(creds, fn)` with a **reset seam** (`DISCARD ALL` / `changeUser`) that wipes session state before a connection returns to the pool. Use for raw-socket SQL (Postgres, MySQL).

Ready-made singletons + cred mappers: `postgres` / `toPgCreds`, `mysql` / `toMySqlCreds`, `redis` / `toRedisCreds`, `mongo` / `toMongoCreds`.

```ts
const creds = toPgCreds(this.context.credentialsAPI.getDecryptedValue(this.credentials.postgres.blob));
const result = await postgres.withConnection(creds, c => c.query(this.fieldValues.query));
return { rows: result.rows };
```

Each process (backend for loaders, worker for execution) holds its own manager singleton, so the two pools are independent.

---

## Checklist for a new node

1. `blueprint.ts` + `node.ts` under the path matching the blueprint id; declare conditional shapes as inline derivatives.
2. Export the class as `export class Node` — the catalogue resolves it by path convention off that export name. Set `public readonly Blueprint = Blueprint`.
3. Credential (if any): define under `Credentials/`, re-export from `Credentials/index.ts`.
4. Register the blueprint id in the right drawer in `packages/shared/constants/drawers.ts`.
5. `npm run generate-indexes` in `packages/nodes` (refreshes `node_index.json` for dist + backend shelf).
6. Typecheck: `npx tsc -p packages/nodes/tsconfig.json --noEmit` (and `node-sdk` / `shared` if you touched them).
