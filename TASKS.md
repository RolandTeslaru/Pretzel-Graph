# Tasks

## Node error strategy — [spec](SPECS/node-error-strategy.md)

- [ ] **node-sdk:** add `onErrorStrategyField` (`MultiOption`: `terminate` default / `propagate` / `do_nothing`); include in `executionStrategyFields` so every blueprint gets it.
- [ ] **shared:** `SystemError` — add `EXECUTION_UNCAUGHT_NODE_ERROR = 2010`, `EXECUTION_CYCLIC_ERROR_PROPAGATION = 2011`; add `UncaughtRuntimeNodeError` / `CyclicalUncaughtRuntimeNodeError` classes (carry `path` in `data`).
- [ ] **worker:** add `errorChannel: Map<Edge.Id, ErrorEnvelope>` to execution context; `ErrorEnvelope { id, error: SystemError.Serialized, path: Node.Id[] }`.
- [ ] **worker:** rewrite `onNodeError` to branch on `onErrorStrategy` — `terminate` (reject as today), `do_nothing` (record + emit, no reject), `propagate` (mint envelope, write to outgoing edges, signal targets, no reject).
- [ ] **worker:** intercept in `onNodeExecuted` — if an incoming edge carries an envelope and node isn't a Catch, `propagateError` (skip `run()`); cycle check (`path.includes` → `CyclicalUncaughtRuntimeNodeError`) and terminal check (no wired outgoing → `UncaughtRuntimeNodeError`).
- [ ] **worker:** keep S2 generic — catch `instance.run()` in `onNodeExecuted` and only re-throw for `terminate`/terminal/cyclic (avoid changing the `onVertexError`→reject contract).
- [ ] **worker:** AND fail-fast in `canNodeRun` — an envelope on any incoming edge fires the node immediately (routes to `propagateError`, not `run()`).
- [ ] **nodes:** `Core/Catch/{blueprint,node}.ts` — `flags.catchesError: true`; `input` Unresolved → `passthrough` Unresolved (normal data) + `onError` Data (serialized error); engine special-cases via the flag.
- [ ] **shared:** register `Core.Catch` in `drawers.ts`; **catalog:** `generate-indexes`.
- [ ] **worker:** document the error model in `packages/worker/README.md`.
- [ ] **sub-workflow boundary (decided):** envelope does NOT cross — inner run rejects, `SubWorkflow/Execute` sees it as its own `onRun` throw and applies *its* `onErrorStrategy` (re-originates a fresh envelope rooted at the Execute node).
- [ ] **open questions (resolve during impl):** multi-error convergence dedup; `do_nothing` partial-run vs skip-signal; tool-mode applicability.

## ResourceLoader / Postgres node

### Typed `LoaderContext` — [spec](SPECS/resource-loader-typed-context.md)

- [x] **node-sdk:** make `RuntimeNode.LoaderContext` / `LoaderFn` generic over `B extends Blueprint`; add typed `fieldValues` (`InferFields<B>`), `credentials` (`InferCredentials<B>`), and a `credentialsAPI` (`getInstance` + `getDecryptedValue`) mirroring `ExecutionContext.credentialsAPI`.
- [x] **node-sdk:** add curried `defineLoaders<B>()` helper (plain string keys) in `builders/loaders.ts`; export from `builders/index`.
- [x] **nodes:** migrate `ResourceLoaderTest/node.ts` to `defineLoaders<typeof Blueprint>()` and drop the `as { value?: string }` casts (`fieldValues.schema?.value`).
- [x] **backend:** `workbench.service.ts` passes no-op `credentials`/`credentialsAPI` stubs to satisfy the new context shape (real injection = next spec).
- [x] **verify:** node-sdk / nodes / backend all typecheck clean; `CatalogueService.getLoader` static-map contract unchanged.

### Credential injection — [spec](SPECS/resource-loader-credential-injection.md)

- [x] **shared:** add `credentialInstanceIds: Record<Template.Id, Instance.Id>` to `Workbench.API.Field.ResourceLoader.LoadOptions.Request` (import `Vault`).
- [x] **frontend:** send `s.data.credentialInstanceIds[nodeId] ?? {}` from `popover-content.tsx`.
- [x] **backend:** `WorkbenchModule` imports `VaultModule` (which now exports `VaultDatabase`); `WorkbenchService` fetches instances via `listByIds` (RLS-gated), builds `credentials` + `credentialsAPI`, removes the no-op stubs.
- [x] **typecheck:** shared / backend / frontend all clean.
- [ ] **runtime verify:** blocked until a node actually declares a credential template — `ResourceLoaderTest` has none yet (mock loaders ignore credentials). End-to-end RLS check happens with the Postgres node.

### Connection layer + Postgres node — [spec](SPECS/postgres-node.md)

- [x] **node-sdk:** `ConnectionManager` base + `SqlConnectionManager` (`withConnection` / `DISCARD ALL`) + Postgres adapter in `src/db/`; added `pg` dep; exported `postgres`/`toPgCreds`.
- [x] **nodes:** `Credentials/Postgres.ts` credential template (+ re-export from `Credentials/index.ts`).
- [x] **nodes:** `Integrations/Postgres/Query` blueprint + node — `operation` MultiOption (reconcile:true) + `query`; `executeQuery` operation only. schema/table fields + loaders parked for future operations (see reconcile.ts + spec).
- [x] **shared:** registered `Integrations.Postgres.Query` in a new `postgres` drawer (`constants/drawers.ts`).
- [x] **catalog:** ran `generate-indexes` — node present in `node_index.json` (dist + backend shelf).
- [x] **typecheck:** node-sdk / nodes / shared / backend / worker all clean.
- [ ] **runtime verify:** pick schema/table from a live DB via the dropdowns (exercises credential injection), then execute a query. Needs a live Postgres + credential instance — user-driven.

### Projection schema — data/array/scalar variants — done

- [x] **shared:** `Projection.Schema` gained a `Data` variant (`array | string | number | boolean | null`) so data ports (`DataList`/`Data`/`Json`/`Text`/`Integer`) — which `Synthesizer.project` passes through raw — actually validate. Previously only `Retriever`'s `z.object({})` covered single objects; arrays (e.g. Postgres query `rows`) matched nothing.

### Type-preserving credential values — done

- [x] **shared:** `Vault.DecryptedValues` → union (`string | number | boolean | string[] | json`), mirroring `staticValues`; encrypt/decrypt already JSON round-trips.
- [x] **node-sdk:** `InferCredentialValues` preserves each field's `initialValue` type (fallback `string`) — so `port: number`, `ssl: boolean`; string credentials (API keys) unchanged.
- [x] **frontend:** `AddCredentialDialog` renders per-variant widgets (Switch for Boolean, number Input for Integer/Float) + per-variant zod, so it emits typed values instead of coercing everything to string.
- [x] **node-sdk:** `toPgCreds` handles boolean `ssl` / numeric `port` (defensive coercion keeps legacy string values working).
- [x] **typecheck:** all six packages clean.

### MongoDB node — [spec](SPECS/mongodb-node.md)

- [ ] **node-sdk:** `mongo.ts` adapter (`ConnectionManager` base, cache `MongoClient`, discrete-fields→URI composition, `toMongoCreds`); add `mongodb` dep; export from index.
- [ ] **nodes:** `Credentials/Mongo.ts` (discrete fields) + barrel export.
- [ ] **nodes:** `Integrations/MongoDB/Operation` blueprint + reconcile + node — find/insert/update/delete; `_id` string→ObjectId in, deep-normalize docs out; single `Json` `result` output.
- [ ] **shared:** add `Integrations.MongoDB.Operation` to the `mongodb` drawer.
- [ ] **catalog:** `generate-indexes`; typecheck all packages.
- [ ] **follow-up:** database/collection ResourceLoader dropdowns (exercises credential injection); then `aggregate` / findOneAnd* / TLS cert fields / per-op `DataList`.

### Follow-ups (specs not yet written)

- [ ] Query-key composition: include `dependsOn` field values in the resource-loader query key so editing an upstream field auto-invalidates dependent loaders.
- [ ] Postgres node operations: `select` / `insert` / `update` / `upsert` / `delete` — each reconciles in `schema` / `table` ResourceLoader fields (+ un-park the schema/table loaders; cast `fieldValues` for reconcile-added fields). Then column loader / resource-mapper grid; SSH tunneling; MySQL / Mongo adapters.
- [ ] Postgres credential SSL: replace the `Use SSL` boolean (currently verify-against-system-CAs) with an n8n-style ssl-mode (`disable`/`require`/`verify-full`) + explicit "allow self-signed" opt-in, to support self-hosted / self-signed Postgres.
