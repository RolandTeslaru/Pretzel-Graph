# Node SDK — Creating Nodes

`@pretzel-graph/node-sdk` is the toolkit for authoring nodes. A node is two files:

- **`blueprint.ts`** — declares the node's identity, fields, input/output ports, and credentials (the *shape*, used by the editor and the type system).
- **`node.ts`** — the `RuntimeNode` subclass that *executes* (the *behavior*, run by the worker).

Optionally a third:

- **`reconcile.ts`** — mutates the field/port schema in response to a field change (e.g. an `operation` selector that swaps which fields are shown).

Nodes are resolved by a **blueprint-id → path convention**. Blueprint id `Integrations.Postgres.Query` lives at `packages/nodes/src/Integrations/Postgres/Query/{blueprint,node,reconcile}.ts`. There is no central registry import — `CatalogueService` dynamic-imports by path.

---

## Quick start — a minimal node

```ts
// packages/nodes/src/Integrations/Acme/Hello/blueprint.ts
import { defineBlueprint, FieldBuilder, InputBuilder, OutputBuilder } from "@pretzel-graph/node-sdk";

export const Blueprint = defineBlueprint({
    id: "Integrations.Acme.Hello",
    displayName: "Hello",
    description: "Greets the incoming name.",
    icon: "Acme",                // SystemIcons or BRAND_ICONS name
    accent: "utility",
    fields: [
        FieldBuilder.String({ id: "greeting", displayName: "Greeting", initialValue: "Hello" }),
    ],
    inputs:  [ InputBuilder.Text({ id: "name", displayName: "Name", required: true }) ],
    outputs: [ OutputBuilder.Text({ id: "message", displayName: "Message" }) ],
});
```

```ts
// packages/nodes/src/Integrations/Acme/Hello/node.ts
import { RegisterNode, RuntimeNode, InferIncoming, InferOutputs } from "@pretzel-graph/node-sdk";
import { Blueprint } from "./blueprint";

@RegisterNode(Blueprint.id)
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
| `icon` | string | A `SystemIcons` (Lucide-style) or `BRAND_ICONS` name. Unknown names render nothing. |
| `accent` | string? | Header accent, e.g. `"utility"` or a `"port-<Type>"` color. |
| `fields` | `FieldBuilder[]` | Static config inputs (the form). |
| `inputs` | `InputBuilder[]` | Typed input ports (left side). |
| `outputs` | `OutputBuilder[]` | Typed output ports (right side). |
| `credentials` | `CredentialTemplate[]?` | Credential templates this node uses. |
| `webhooks` | `WebhookBuilder[]?` | Inbound webhook definitions. |
| `toolCompatible` | boolean? | If true, the node can also be built as a LangChain tool (`onBuildTool`). |
| `flags` | record? | Arbitrary node-level flags. |

`defineBlueprint` also auto-appends the `signalDependency` / `dataDependency` strategy fields (and a hidden tool field when `toolCompatible`).

---

## Field builders — `FieldBuilder.*`

Fields are the node's **static config form**. Every builder shares these `BaseProps`:

`id` (required, branded `Field.Id`), `displayName` (required), `required?`, `hidden?`, `tooltip?`, `reconcile?` (fire `reconcile.ts` on change), plus a per-type `initialValue`.

| Builder | Value type | Notes |
|---|---|---|
| `String` | string | `multiline?` for a textarea; `placeholder?` |
| `UniqueString` | string | String constrained unique within a set |
| `Integer` / `Float` | number | `min?` `max?` `step?` `slider?` |
| `Boolean` | boolean | renders a switch/checkbox |
| `MultiOption` | option value | `options: [{value, displayName}]`, `variant?: "select" \| "tab"` |
| `Json` | any JSON | stores a **parsed** object (not a string) |
| `Script` | string | code/SQL editor |
| `Password` / `Secret` | string | masked input |
| `File` | file ref | |
| `List` | string[] | |
| `CaseList` / `Condition` / `Variadic` | — | routing / branching constructs |
| `ResourceLoader` | `{ mode, value }` | dynamic dropdown backed by a loader — see below |

Read field values at runtime via **`this.fieldValues.<id>`** (typed by `InferFieldValues`).

---

## Port builders — `InputBuilder.*` / `OutputBuilder.*`

Ports are **typed connections** between nodes. The variant determines connection compatibility, the port color, and (for lists) fan-out semantics.

Shared props: `id`, `displayName`, `tooltip?`, `placeholder?`, `required?` (inputs).

| Variant | Meaning |
|---|---|
| `Message` / `MessageList` | LangChain chat message(s) |
| `Text` | plain string |
| `Data` | **a single item** — a plain object or scalar |
| `DataList` | **an array of items** — fans out downstream (the batch-array model) |
| `Json` *(output)* / `Integer` *(output)* / `DataFrame` *(output)* | typeless / scalar / tabular |
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
import { defineCredential, FieldBuilder } from "@pretzel-graph/node-sdk";
export const Acme = defineCredential({
    id: "acmeApi",
    displayName: "Acme",
    icon: "Acme",
    fields: [ FieldBuilder.Password({ id: "apiKey", displayName: "API Key", required: true }) ],
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
- `getPropagationStrategy()` → `"all"` (default) / `"router"` (only ports present in the result) / `"none"` (node handled propagation itself).
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

`LoaderContext` gives `fieldValues` (typed `InferFieldValues`), `credentials` + `credentialsAPI` (same as execution), `searchQuery`, `paginationCursor`. A field declares `loaderId: "schemaSearch"` and may declare `dependsOn: ["otherField"]` so changing the dependency re-fetches.

---

## `reconcile.ts` — operation-driven schemas

When a field with `reconcile: true` changes, `reconcile(blueprint, changedFieldId, newValue)` returns a mutated blueprint (add/remove fields **or output ports**). Used for an `operation` selector that shows different fields per operation.

```ts
export const reconcile = (blueprint, changedFieldId, newValue) => {
    const next = cloneDeep(blueprint);
    if (changedFieldId !== "operation") return next;
    const fields = new Map(next.fields.map(f => [f.id, f]));
    if (newValue === "SET") fields.set("value", FieldBuilder.String({ id: "value", displayName: "Value" }));
    else fields.delete("value");
    next.fields = [...fields.values()];
    return next;
};
```

**Important wrinkle:** the base blueprint = the **default** field set (reconcile only runs on *change*, never at node creation). And `InferFieldValues` reflects the *static base* — fields/ports added by reconcile are **not** in the inferred type, so `onRun`/loaders read them via a cast (`(this.fieldValues as Record<string, unknown>).value`). See `Integrations/Redis/Command` and `Integrations/MongoDB/Operation`.

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

1. `blueprint.ts` + `node.ts` (+ `reconcile.ts`) under the path matching the blueprint id.
2. Decorate the class with `@RegisterNode(Blueprint.id)` and set `public readonly Blueprint = Blueprint`.
3. Credential (if any): define under `Credentials/`, re-export from `Credentials/index.ts`.
4. Register the blueprint id in the right drawer in `packages/shared/constants/drawers.ts`.
5. `npm run generate-indexes` in `packages/nodes` (refreshes `node_index.json` for dist + backend shelf).
6. Typecheck: `npx tsc -p packages/nodes/tsconfig.json --noEmit` (and `node-sdk` / `shared` if you touched them).
