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

## Outbound HTTP client + node proxies — spec not written

`HTTP.ClientAPI` / `NetworkProxy` types in `node-sdk/src/domain/`; implementations in `worker/src/compiler/{http,proxy}.ts`. Nodes build clients via `this.httpClientFactory` (`RuntimeNode`), which binds the node's attached `networkProxy` credential. Agents are execution-scoped and destroyed in `AggexEngine.run()`'s `finally`.

- [x] **node-sdk:** `domain/http.ts` (`HTTP.Error` / `Client` / `Client.Config` / `ClientAPI`) + `domain/networkProxy.ts` (`Config`, branded `URL`, `toUrl`, `Agent`, `API`, `TEMPLATE_ID`). `Client.Config` omits axios's `proxy`/`httpAgent`/`httpsAgent` so a caller can't bypass the node's proxy.
- [x] **worker:** `compiler/http.ts` — axios factory with execution-abort binding, retry on 408/425/429/5xx (`Retry-After` aware, jittered backoff), `HTTP.Error` normalization; agents spread last with `proxy: false`.
- [x] **worker:** `compiler/proxy.ts` — `buildAgent` (socks5 → one `SocksProxyAgent`; http/https → `Http`/`HttpsProxyAgent` pair, since Node selects by *target* scheme), lazy per-instance cache, `getAgent`/`getAgentForNode`/`destroyAll`. Fail-open on a broken credential; never logs the cause (can carry credential material).
- [x] **nodes:** `Credentials/NetworkProxy.ts` template (protocol / host / port / username / password).
- [x] **node-sdk:** `RuntimeNode.httpClientFactory` — injects `getAgentForNode(this.nodeId)`; arrow body so the agent resolves lazily on `create()`.
- [x] **migrated:** Polymarket (own client), Kalshi (SDK spliced via `client.raw`), Massive, Alpaca.
- [x] **migrated:** Uniswap/Swap — `uniswapPost(apiKey, …)` replaced by a `tradeApi` client built once in the constructor (API key is a constant header). Only the Trading API is covered; see the viem gap below.
- [ ] **migrate remaining direct-axios nodes:** HyperLiquid/Market, HyperLiquid/Account, Coinbase/Market, Google/Search, Uniswap/Swap. Module-level helpers take no client — each needs `HTTP.Client` threaded in from the node constructor. **Until done these silently ignore an attached proxy**, which is the worst failure mode for a geo-unblocking feature. (`services/AxiosService.ts` stays — internal backend calls, not third-party egress.)
- [ ] **editor UI — attach a proxy to any node.** The "universal credential" problem: the inspector only offers credentials from `blueprint.credentials`, and `networkProxy` is declared on no blueprint. `Validation.ts:86` iterates blueprint-declared credentials and must skip the universal one. Biggest remaining chunk, not mechanical.
- [ ] **proxy-layer error rewriting:** emit `proxy <host>:<port> unreachable` instead of passing through the underlying message — agent libs can include the proxy URI (with password) in errors. Also: on a non-200 CONNECT reply `HttpsProxyAgent` returns a fake unwritable socket, so proxy rejections surface as confusing vendor errors.
- [ ] **transports with no injection seam (proxy blind spots).** Three libraries do their own HTTP and silently ignore an attached proxy: `viem` (Uniswap RPC — fetch-based; fixable via a custom `fetchFn` + undici `ProxyAgent`, a different mechanism from the axios agents), `@coinbase/agentkit`, and `@polymarket/clob-client`. Uniswap is the worst case: its Trading API calls are proxied but `sendTransaction` is not, so the node is *partially* routed. Decide whether the UI marks these nodes as proxy-unsupported rather than letting users discover it.
- [ ] **decide fail-open vs fail-closed** on an unusable proxy credential. Currently fail-open (connects directly); fail-closed is arguably right for geo-unblocking.
- [ ] **deferred — DB proxying:** `ConnectionManager` keys pools by `sha1(creds)` and is a process-wide singleton with a 5-min TTL, incompatible with execution-scoped agents.
- [ ] **regenerate catalog:** `npm run generate-indexes` in `packages/nodes` — Kalshi/Polymarket blueprints changed (credential + `summary` port removed). Held back: unrelated uncommitted diff in both `node_index.json` files.

## Integration node tiers — Market / Account / Trading — spec not written

Split provider integrations by **blast radius, not API host**: `Market` (public data, harmless) / `Account` (own private state, read-only) / `Trading` (moves money). A paper/live `environment` field belongs on Account + Trading, never Market. Reference data served from a trading host (Alpaca `/v2/assets`) still belongs in Market.

- [x] **Kalshi/Market:** credential dropped — all market-data endpoints verified public (portfolio 401s). SDK now built with no `Configuration`, so its RSA-PSS interceptor stays a no-op; `basePath` pinned rather than inherited.
- [ ] **Alpaca/Market:** keep `listAssets` (harmless); drop the `environment` field. **Blocked on:** confirming paper and live return identical asset lists — if not, the field stays.
- [ ] **Alpaca/Account:** new node — `environment` field + `/v2/account`, `/v2/positions`, `/v2/account/portfolio/history`, `/v2/account/activities`. Endpoints are from the docs; can't be probed (401 without a key).
- [ ] **Alpaca/Trading:** deferred — order placement is its own feature.
- [ ] **Kalshi/Account + Kalshi/Trading:** not started; credential + RSA-PSS signing live here, via `client.raw`.
- [ ] **Polymarket:** same split pending. Note `@polymarket/clob-client` gives no seam to inject an axios instance, so it would bypass the proxy — the hand-written client stays.
- [ ] **document the convention** in `packages/node-sdk/README.md` so new integrations follow it without rediscussion.
- [x] **HyperLiquid/Market + Account:** share `Integrations/HyperLiquid/publicClient.ts` (`HyperLiquidPublicClient`) — the whole `/info` API is unauthenticated, and Account reads are keyed by an arbitrary wallet address, so neither node is privileged. Account is Market-tier in blast radius despite the name.
- [ ] **HyperLiquid/Trading:** `POST /exchange`. Auth is **in the payload, not a header** — EIP-712 signed actions (`{ action, nonce, signature, vaultAddress? }`); the exchange recovers the address from the signature. Needs a separate *signing* client, not `HyperLiquidPublicClient`.
- [ ] **HyperLiquid credential = API/agent wallet** (decided). An agent wallet can trade but **cannot withdraw**, so a leak costs unwanted trades rather than the whole wallet. Master keys still work if a user enters one; agent wallet is the default and documented path (field label + tooltip + credential description). Look at how Uniswap's existing EVM private-key credential is defined before adding a second one.

## Coinbase teardown — misfiled nodes — spec not written

Both Coinbase nodes were filed by *which SDK they use* rather than *what they do*. No workflows reference either, so blueprint-id changes are free.

- [ ] **`Coinbase/Market` → `DeFiLlama/Protocol`:** the node never calls Coinbase — it calls Pyth (`hermes.pyth.network`) and DeFiLlama (`api.llama.fi`) behind a `dataSource` switch, with one `price` output port meaning "asset price" in one mode and "total TVL" in the other. **Retire the Pyth half** (HyperLiquid `mids()` already covers crypto prices — 938 coins; Pyth's edge is equities/FX/metals but the node hardcodes `asset_type: "crypto"`). Keep DeFiLlama as its own provider. Needs a `drawers.ts` entry + `generate-indexes`.
- [ ] **bug, dies with the Pyth half:** `Coinbase/Market/node.ts:62` reports `decodePrice(parsed.ema_price)` as `confidence`. That's the EMA *price*, not the confidence interval — the real one is `price.conf`. Verified live on BTC: price $66,059.36, `conf` $19.29, ema_price $65,794.35. Off by ~3400x. Fix if the Pyth path is kept for any reason.
- [ ] **also in the Pyth path:** `node.ts:55` falls back to `feeds[0]` when no exact base+USD match — Pyth returns deprecated feeds first (querying "BTC" returns `DEPRECATED FEED - MERLIN SEAL BITCOIN`).
- [ ] **split `Coinbase/Token` into two nodes.** `erc20ActionProvider` exposes 5 actions: `get_balance`, `get_allowance`, `get_erc20_token_address` (reads) vs `transfer`, `approve` (writes). `approve` grants a spender *standing* access — the classic drain vector — so it must not sit in the same agent toolkit as a balance check.
  - [ ] **`EVM/Token`** (new, read): drop AgentKit **and the credential entirely** — ERC-20 reads are public chain data. Use a `viem` public client (already a dep via Uniswap). Reads *any* address; today `get_allowance` is hardcoded to the connected wallet (`erc20ActionProvider.js:170`) for no reason. Name stays `Token` (decided).
  - [ ] **`Coinbase/Transfer`** (existing node gutted, write): keeps AgentKit + the CDP credential (`cdpKeyId`/`cdpKeySecret`/`walletSecret`) + `transfer`/`approve`. Renamed from `Token` — the write node's name is the one that can mislead someone into wiring it up casually.
  - [ ] **open question:** RPC endpoint for the read node. Public per-chain endpoints are rate-limited/flaky; keyed ones (Alchemy/Infura) embed the key in the URL, which makes it a credential. Suggested: public default per network + optional override field.
- [ ] **proxy blind spot:** AgentKit does its own HTTP with no axios-instance seam, so an attached `networkProxy` silently does not apply (same as `@polymarket/clob-client`). "Attach a proxy to any node" is not universally true — surface this in the UI rather than letting users discover it.
- [ ] **orphaned:** `Credentials/Kalshi.ts` is now referenced by nothing (Kalshi/Market dropped it). Keep as the placeholder for Kalshi/Trading, or delete.

## Uniswap — calldata trust — spec not written

`Uniswap/Swap` forwards the routing service's response straight into `wallet.sendTransaction` (`node.ts:188`): the gateway chooses `to`, `data` and `value`, and the node's private key authorizes whatever came back. A compromised gateway, MITM or DNS hijack could return calldata pointing at a hostile contract and the signature would be perfectly valid.

- [ ] **validate before signing:** check `to` against the known Uniswap router addresses for the chain; enforce a slippage bound rather than trusting the quote's `minAmountOut`; cap `value` so a swap can't spend more native token than intended.
- [ ] **relevant to the proxy work:** routing quote requests through an untrusted proxy puts the operator between the node and the calldata it signs. Fine for public price reads, meaningfully worse here — an argument for splitting `Uniswap/Quote` (API key only) from `Uniswap/Swap` (private key).
- [ ] **credential is over-scoped:** `Credentials/Uniswap.ts` bundles `apiKey` (revocable, worth a rate limit) with `privateKey` (the wallet, irreversible if leaked). A quote needs only the first.

## Credential field validation — spec not written

`Field.Schema` has `required` and numeric `min`/`max` only — credential validation today is "is it non-empty". Failures surface mid-run, from inside a library (`privateKeyToAccount` throwing on a malformed key, Kalshi's signer on a bad PEM).

- [ ] **add optional `pattern` + `patternMessage` to `Field.Schema`**, honoured in the credential form. Apply to **standard-defined** formats only: EVM private key (`0x` + 64 hex), RSA PEM (`-----BEGIN`), host/port, connection strings.
- [ ] **do NOT regex vendor API keys** (Anthropic/OpenAI/Tavily/Alpaca). Vendors change key formats without notice; a stale regex rejects a *valid* key and the user cannot self-diagnose it. Worse failure than accepting a typo.
- [ ] **higher value, bigger job — "Test" button per credential template:** one real call (`/v2/account` for Alpaca, `SELECT 1` for Postgres, a CONNECT for NetworkProxy). Catches what a regex cannot: revoked keys, wrong environment, missing entitlement, unreachable host.
