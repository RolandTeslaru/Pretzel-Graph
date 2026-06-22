# Tasks

## Node error strategy — [spec](SPECS/node-error-strategy.md)

- [x] **node-sdk:** add `onErrorStrategyField` (`MultiOption`: `terminate` default / `propagate` / `do_nothing`); included in `executionStrategyFields` (auto-injected into every blueprint by `defineBlueprint`).
- [x] **shared:** `SystemError` — added `EXECUTION_UNCAUGHT_NODE_ERROR = 2010`, `EXECUTION_CYCLIC_ERROR_PROPAGATION = 2011`. **worker:** added `UncaughtRuntimeNodeError` / `CyclicalUncaughtRuntimeNodeError` (extend `AggexExecutionError`, carry `path` in `data`).
- [x] **worker:** added `errorChannel: Map<Edge.Id, ErrorEnvelope>` to execution context (init in compiler); `ErrorEnvelope { id, error: SystemError.Serialized, path: Node.Id[] }` defined in `AggexEngine.Execution`.
- [x] **worker:** extracted `recordNodeError` (shared by S2 hook + inline handler); added `handleNodeError` branching on `onErrorStrategy` — `terminate` (re-throw → reject as today), `do_nothing` (record + emit, fire nobody), `propagate` (mint envelope → `propagateError`). `propagateError` writes envelope to outgoing edges + returns router-style target set; `materializeCaughtError` for Catch nodes writes `onError` + fires only that branch.
- [x] **worker:** intercept at top of `onNodeExecuted` — incoming envelope → consume + (Catch ? materialize : propagate), skipping `run()`; cycle check (`path.includes` → `CyclicalUncaughtRuntimeNodeError`) + terminal check (no wired outgoing → `UncaughtRuntimeNodeError`). `onNodeCompleted` early-returns for `failed` nodes so the returned set still drives fan-out without stomping status/edges.
- [x] **worker:** kept S2 generic — `try/catch` around `run()`/`buildTool()` in `onNodeExecuted`; only `terminate`/terminal/cyclic re-throw to reach `onVertexError`.
- [x] **worker:** AND fail-fast in `canNodeRun` — an incoming envelope returns `true` (fires immediately, routes to interception). Catch-flag read via narrow cast (base `RuntimeNode` doesn't declare `Blueprint`; avoids `override` churn across 51 nodes).
- [x] **nodes:** `Core/Routing/Catch/{blueprint,node}.ts` — `flags.catchesError: true`; `input` Unresolved → `passthrough` Unresolved (`"router"` so only passthrough fires) + `onError` Data; inert (plain passthrough) until the engine special-cases the flag.
- [x] **shared:** registered `Core.Routing.Catch` in the `routing` drawer; **catalog:** `generate-indexes` ran (50 nodes, synced to backend shelf). Typecheck clean across node-sdk/shared/nodes/worker.
- [x] **worker:** documented the error model in `packages/worker/README.md` (new "Error handling & propagation" section after propagation strategies).
- [x] **frontend:** route `onErrorStrategy` into the **Execution Behavior** panel section (`NodePanel/index.tsx` — added to the `signalDependency`/`dataDependency` filter) so it renders alongside the other strategy selects instead of in the generic Fields list. No new TS errors in touched file (frontend has pre-existing unrelated `noUnusedLocals` warnings).
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

## Debug Mode (warm-kernel stepping) — [spec](SPECS/debug-mode.md)

> Builds on the working `pause` mechanism (instances-alive-by-not-serializing) and complements "Execute up until this point" (`stopAtNodeId`). Never serializes → sidesteps the instance-revival wall entirely.

### Phase 1 — Engine: super-step barrier + frontier
- [ ] **worker (S2):** add `stepMode` + re-armable `stepBarrier` to `S2Engine.ExecutionContext`; in `fireVertex`, gate `fireVertexDependents` behind the barrier when `stepMode` (mirror the existing pause-gate placement at `S2/engine.ts:205→210`). Off by default → zero change to normal runs.
- [ ] **worker (S2):** expose `getRunnableFrontier(): Set<Vertex.Id>` (vertices passing `canVertexRun`) and `getVertexGateState(id)` (`{ signalsHave, signalsNeed, dataReady }`) for the UI.
- [ ] **worker (S2):** `overrides.releaseOneSuperStep()` — snapshot the frontier, fire each, re-arm the barrier so dependents wait. Optional `releaseOneNode(id)` for single-node granularity.

### Phase 2 — DebugController + ignite-paused
- [ ] **shared:** `Execution.Igniter` add `workbench_debug` variant; `Execution.Signal` add `debug:step` / `debug:fireNode {nodeId}` / `debug:continue` / `debug:reset`; `Execution.Status` add `debugging`; `Execution.Event` add `debug:frontier`.
- [ ] **worker:** `debug-controller.ts` — state machine over one paused engine; maps signals → `overrides`/`schedulerAPI`; emits `debug:frontier` after each batch.
- [ ] **worker (compiler):** `workbench_debug` compiles the FULL graph normally but ignites paused (pause/stepMode before firing `__START__`).
- [ ] **worker (engine):** route `onNodeCompleted` through the DebugController barrier in debug mode; surface `isNodeRunnable` (publicize `canNodeRun`).

### Phase 3 — Life Support
- [ ] **worker:** `life-support.ts` — `open/keep-alive/idle-evict/teardown`; lock extension; idle-eviction timer (reset by `debug:heartbeat`); dispose engine + airlock isolate on evict/continue/terminate.
- [ ] **worker:** caps — `MAX_CONCURRENT_DEBUG_SESSIONS`, per-session memory ceiling, graceful refusal over budget. Decide dedicated debug worker pool vs normal queue (open question #5).
- [ ] **worker:** keep the warm engine in `runningEnginesMap` for the session lifetime; don't complete the job until `debug:continue`/evict.

### Phase 4 — Backend + Frontend
- [ ] **backend:** `startDebug` / `debugStep` / `debugFireNode` / `debugContinue` endpoints (mirror `pause`/`suspend`); set/clear `debugging` status.
- [ ] **frontend:** `ExecutionSDK` actions `startDebug(target?)` / `step()` / `fireNode(id)` / `continue()`; consume `debug:frontier`.
- [ ] **frontend:** Debug toolbar (Step / Continue / Stop) + per-node fire affordance + canvas frontier highlight; show the inputs a node *will read* before firing (no blind fires).

### Open questions (resolve during impl — see spec)
- [ ] Igniter shape (new variant vs `debug:true` flag); manual-fire gating (always vs `canVertexRun`-only); step granularity (super-step vs node); side-effect honesty in UI; queue model (dedicated pool); reconnect/grace policy; cycle-step legibility vs short-circuit guard; resumable debug sessions explicitly out of scope (needs the parked revival layer).

## Item-scoped source port — [spec](SPECS/item-scoped-source-port.md)

Port on the **blueprint** (`itemScope: "list"`, compile-time-checked against input ids); field keeps the **boolean** `itemScoped: true`. `Field.ts` / `FieldBuilder.itemScoped` / `InferItemFields` unchanged.

- [ ] **node-sdk:** `builders/index.ts` — `defineBlueprint` gains `itemScope?: TInputs[number]["id"]` (config + `DefineBlueprintReturn` + threaded onto the blueprint). Optional runtime assert `itemScope` ∈ input ids.
- [ ] **nodes:** `Core/Utils/List/Filter/blueprint.ts` — add `itemScope: "list"`. Typecheck node-sdk + nodes; confirm a wrong port literal is a type error.
- [ ] **frontend:** `airlockTypes.ts` — `getItemType(nodeId, port)` reads `getIncomingShape(nodeId)[port]` (drop the single-array heuristic); `buildAirlockDts({ itemSourcePort })` gates/types on it.
- [ ] **frontend:** FieldRenderers (Boolean/String/Integer/Float/Json/MultiOption) pass `itemSourcePort: field.itemScoped ? blueprint.itemScope : undefined`; `withExpression.tsx` + `ExpressionEditor` prop `itemScoped?: boolean` → `itemSourcePort?: string`; thread into `AirlockSDK.previewExpression`.
- [ ] **frontend:** `AirlockSDK.buildGlobals`/`previewExpression` — sample `$item` from `incoming[port][0]` when a port is given; present-but-`undefined` otherwise. Typecheck frontend; verify on `Filter.condition`.
- [ ] **follow-up (deferred):** runtime auto-resolve of the iterated list from `inputs[Blueprint.itemScope]`; optional `CaseList.tsx` `itemSourcePort` forwarding. (Per-field ports / multi-loop binding explicitly out of scope.)
