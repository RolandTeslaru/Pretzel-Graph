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
- [x] **nodes:** `Integrations/Postgres/Query` blueprint + node — `query` field and `executeQuery` behavior. Schema/table fields + loaders remain parked for future derivative-backed operations (see spec).
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

- [x] **node-sdk:** `mongo.ts` adapter (`ConnectionManager` base, cache `MongoClient`, discrete-fields→URI composition, `toMongoCreds`); add `mongodb` dep; export from index.
- [x] **nodes:** `Credentials/Mongo.ts` (discrete fields) + barrel export.
- [x] **nodes:** `Integrations/MongoDB/Operation` blueprint + inline derivatives + node — find/insert/update/delete; `_id` string→ObjectId in, deep-normalize docs out; bounded data outputs.
- [x] **shared:** add `Integrations.MongoDB.Operation` to the `mongodb` drawer.
- [x] **catalog:** `generate-indexes`; MongoDB is present in the generated shelf catalog.
- [ ] **verify:** run the package typechecks for the MongoDB adapter/node change.
- [ ] **follow-up:** database/collection ResourceLoader dropdowns (exercises credential injection); then `aggregate` / findOneAnd* / TLS cert fields / per-op `DataList`.

### Follow-ups (specs not yet written)

- [ ] Query-key composition: include `dependsOn` field values in the resource-loader query key so editing an upstream field auto-invalidates dependent loaders.
- [ ] Postgres node operations: `select` / `insert` / `update` / `upsert` / `delete` — each declares `schema` / `table` ResourceLoader fields in an inline derivative. Then column loader / resource-mapper grid and SSH tunneling.
- [ ] Postgres credential SSL: replace the `Use SSL` boolean (currently verify-against-system-CAs) with an ssl-mode enum (`disable`/`require`/`verify-full`) + explicit "allow self-signed" opt-in, to support self-hosted / self-signed Postgres.

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

- [x] **node-sdk:** `builders/index.ts` — `defineBlueprint` gains `itemScope` and validates it against declared input ids at runtime.
- [x] **nodes:** `Core/Utils/List/Filter/blueprint.ts` — add `itemScope: "list"`.
- [ ] **verify:** typecheck node-sdk + nodes and confirm a wrong `itemScope` literal is rejected.
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
- [ ] **migrate remaining direct-axios nodes:** Google/Search still calls Axios directly and does not use `HTTP.Client`. HyperLiquid/Market, HyperLiquid/Account, and Uniswap/Swap are already migrated. (`services/AxiosService.ts` stays — internal backend calls, not third-party egress.)
- [x] **editor UI — attach a proxy to any proxy-compatible node.** `defineBlueprint` adds the optional proxy credential, the node options/toolbar expose attach/remove, and the inspector excludes the universal proxy credential.
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

## Backend — Principal plumbing — spec not written

Guards resolve identity into a typed `Principal` on the request; controllers read it via `@CurrentUser()`; services take it as their first parameter instead of `(token, userId)`. Removes the `as Auth.User.Id` casts (the brand was being *asserted* by controllers rather than derived from the guard) and the per-call `createAuthenticatedClient` rebuild. This is a prerequisite for workspace scoping: once `workspaceId` lands on `Principal`, `tsc` locates every call site that needs it.

- [x] **backend:** `SupabaseAuthGuard` constructs `Principal.User` onto `request.principal`; legacy `request.user` / `request.token` still set alongside it for the one un-migrated route.
- [x] **backend:** `decorators/principal.ts` — `CurrentUser` (narrows to `Principal.User`, 401s on anything else) and `CurrentPrincipal` (full union, for routes reachable by both a user and a service).
- [x] **backend:** migrated controller + service pairs — VersionControl, Vault, Library, Workbench, Chat, Auth, HumanReview, ApiKeys, and the 12 `SupabaseAuthGuard` routes on Execution. `createAuthenticatedClient` call sites 70 → 5 (the definition, the guard, and the realtime gateway).
- [x] **backend:** `Shelf` deliberately takes no principal — the blueprint catalogue is identical for every caller, so a principal parameter would imply a per-user response and an authz check that don't exist.
- [x] **backend:** removed three dead `token` parameters found during the Execution migration — `heartbeat`, `terminateAll` and `recording.getLive` all accepted a JWT and never built a client with it (they signal over Redis or use `serviceSupabase`).
- [ ] **backend:** `ApiKeyAuthGuard` → `Principal.ApiKey` carrying `userId` + `keyId` (both required, unlike `Principal.Service.authorizedByUserId` which is optional). **Deferred** — one route uses it (`execution/sdk/run`) and its shape changes when API keys become workspace-scoped, so design it once with `workspaceId` rather than twice. Note the guard builds **no RLS-scoped client**, so this principal must carry no `supabase` field: the SDK path runs entirely on service-role today, and a shared `supabase` property across `Principal.User | Principal.ApiKey` would silently mean "RLS-scoped" for one and "god mode" for the other.
- [ ] **backend:** `InternalAuthGuard` → `Principal.Service` (a `service` name and nothing else), replacing the ad-hoc `request.internal = { service, token }` that no param decorator can read. No separate `Principal.Internal` variant — it would carry no fields of its own. `RuntimeNodeAuthGuard` is **gone**: `DelegateAuthGuard` replaced it and resolves `Principal.Delegate` via `@AuthenticatedDelegate()`, so the runtime half of this landed with per-execution tokens.
- [ ] **backend:** drop `request.user` / `request.token` from `AuthenticatedRequest` once `execution/sdk/run` moves; `Auth` then disappears from the Execution controller's imports.
- [ ] **backend:** `realtime.gateway.ts` builds its own client during the socket handshake and was never in scope for this migration. Several workspace-tenancy items land in the same file (WS keepalive, subscription teardown on revocation, membership checks), so do them together.
- [ ] **backend:** two admin endpoints have inconsistent privilege — `terminateAll` gates on `assertUserAdmin` then works through `serviceSupabase` (sees everything), while `meta.listActive` gates the same way but queries with the caller's RLS-scoped client, so an admin asking for all active executions gets **only their own**. Pre-existing; one of the two is wrong.
- [ ] **note (measured, not a reason to do this work):** `createClient` costs ~36 µs and ~16 KB, spawns no timers and opens no sockets. At two per request that is ~72 µs — far below the `getUser()` network round trip in the same request. The migration's value is type safety and workspace-readiness, not throughput.

## Execution data growth — spec not written

`executions` is the only table that grows with *machine* activity rather than human activity, and nothing currently deletes anything. `session.node_output_instances` holds **every node's output on every run** and is not nullable — the opt-in `recording` column (`igniter.record === true`) is the smaller problem. One workflow on a 5-minute cron is ~105k rows/year; with batch arrays flowing through ports, a single such workflow can produce gigabytes per day.

- [ ] **worker (urgent, crash not cost):** `FlightRecorderService` accumulates in memory and `getRecording()` is only called at the end of a run. Cycles are first-class, so a node can fire thousands of times in one execution and each firing appends. The worker OOMs before persistence is ever reached — and at `concurrency > 1` that kills every other execution on the process. Add an internal cap (max units, or a ring buffer keeping first N + last N, which is what you want for debugging a runaway loop anyway).
- [ ] **backend:** retention with **both** a count and an age dimension — they fail differently (count bounds a burst, age bounds slow accumulation). Prior art: n8n prunes at 14 days *or* 10,000 executions. A per-workflow "last 10" rule is a good third variant since it guarantees recent history for rarely-run workflows.
- [ ] **backend:** strip rather than delete. `Execution.Meta` already omits `session` + `recording`, so hollow out expired rows instead of removing them: null `session.node_output_instances` and `node_output_projections`, **keep `node_status` and `edge_state`** (bounded by node/edge count, kilobytes). A three-month-old execution then still shows which nodes ran and which failed, with the payloads gone. Keep `igniter` too — it is what a re-run needs.
- [ ] **backend:** count-based retention bounds rows, not bytes. Add a per-execution size ceiling and truncate with a marker the UI can render as "output too large to store" (an empty node reads as a bug). `MAX_PUBSUB_PAYLOAD_BYTES` (5 MiB) is the pub/sub twin of this guard and a reasonable starting value.
- [ ] **backend:** move `session.node_output_instances` and `recording` out of Postgres into object storage keyed by execution id, with the row keeping a pointer. Large jsonb goes to TOAST, every write is amplified through WAL and replication, and all of it lands in backups — so restore time grows with data nobody reads. Bucket lifecycle rules then do expiry for free. `has_recording` already proves the pattern (list queries don't touch payloads).
- [ ] **database:** partition `executions` by `created_at` (monthly) **before the table is large**. Expiry becomes `DROP TABLE` on a partition — instant, no vacuum, no bloat — instead of a multi-million-row `DELETE` that bloats the table and starves autovacuum. Converting a large table to partitioned afterwards is a full rewrite.
- [ ] **sleeper:** `version_control.workflow_data` stores a **full workflow copy per publish**. Bounded by human action so it grows far slower, but the same shape of problem — cap at the last N versions per workflow, or store diffs.

## Auth and RLS hardening — spec not written

Findings from an audit of the 35 policies in `SPECS/rlspolicies.json` and the four auth guards. RLS is enabled on all ten tables with no gaps, so the coverage assertion in the workspace-tenancy spec would pass today.

- [ ] **database (cheap, mechanical):** ~32 of 35 policies call bare `auth.uid()`, which Postgres re-evaluates **once per row**. Wrap as `(select auth.uid())` for a one-time InitPlan. Worst where it matters most — the `chat_messages` policies put the per-row call inside a subquery against `chats`. `users.SELECT` and the three `executions` policies already use the wrapped form.
- [ ] **backend:** `supabase-auth.guard.ts` calls `getUser()` on **every request**, a network round trip to GoTrue to validate a signed token. Verify the JWT signature locally instead, with the algorithm pinned. Use `verify()`, never `decode()` — `decode` checks nothing, so anyone could present `{"sub": "<any-uuid>"}`. Also: the guard's `catch` swallows every failure as 401, so a GoTrue outage reads as "everyone is logged out" rather than a 503.
- [ ] **database:** the `chats` INSERT policy checks only `auth.uid() = user_id` — nothing stops attaching a chat to another user's `workflow_id`. `ChatService.create`/`ensure` cover it via `assertWorkflow`, but `workflows_insert` already expresses the equivalent parent check *in the policy* (validating `folder_id` ownership), so the two relationships are enforced at different layers. Moving it into the policy also removes a `serviceSupabase` read, since `assertWorkflow` → `loadWorkflowOwner` bypasses RLS to look up the owner.
- [ ] **backend:** `internal-auth.guard.ts` calls `getConfiguredInternalTokens()` on every request, walking all of `process.env` and rebuilding a `Map`. Hoist to module scope.
- [ ] **backend:** `PermissionService.OWNERSHIP_CACHE_MAX` is not actually enforced — `cacheOwner` calls `pruneExpired()` at the cap, but if nothing has expired it removes nothing and the `set` proceeds anyway. Real bound is request-rate × 5 min TTL.
- [ ] **product:** `workflows_select` is `(user_id = auth.uid()) OR (is_public = true)` with no role restriction, so `anon` can read the **full `data` jsonb** of a public workflow (and `version_control` does the same for active publications). Credentials are safe — referenced by id — but a value hardcoded into a field rather than stored as a credential is published with it. Warn in the share dialog.
- [ ] **backend:** the API-key path has **no RLS at all** — `ApiKeyAuthGuard` authenticates with `createServiceClient()` and `runFromSdk` runs on `serviceSupabase` end to end. Restoring it needs a client acting as the resolved user: minting a JWT (requires the legacy HS256 secret — check whether the project has migrated to asymmetric signing keys) or, after a move to a direct Postgres driver, a `set_config('request.jwt.claims', …)` inside the transaction.

## Workspace tenancy — gaps in the spec

Items that belong in `SPECS/workspace-tenancy.md` and are not currently covered.

- [ ] **execution data growth.** The spec's `MAX_PUBSUB_PAYLOAD_BYTES` guards Redis pub/sub — a different problem. It stops one oversized message degrading the instance and does nothing about a table growing without bound. See the Execution data growth section above.
- [ ] **egress control (SSRF).** Workers open arbitrary user-configured network and database connections, so a workflow can reach internal services — other tenants' workers, Redis, cloud metadata endpoints. The silo helps (a per-workspace Redis ACL refuses them) but the worker machines need a network policy blocking internal/private ranges.
- [ ] **`region` column on `workspaces` from day one**, even if every row reads `us-east-1` for years. EU data residency is answered with **regional pools** (2–3 Supabase projects, fixed N) rather than per-tenant databases (N grows with signups). Note residency covers the whole data plane, not just Postgres: Redis job payloads currently carry decrypted credentials, and LLM inference egress ships workflow data to whichever region the model endpoint lives in regardless of infrastructure placement.
- [ ] **write membership behind a function so a future split is a one-liner.** Policies should call `auth_workspace_ids()` (a `security definer` function returning the caller's workspace ids) rather than inlining `select workspace_id from workspace_members where user_id = (select auth.uid())`. In a pooled database it queries the membership table; in a split single-tenant database — where `workspace_members` lives elsewhere and the subquery cannot run — it returns the workspace claim. One function redefinition instead of rewriting 35 policies.
- [ ] **chats are workspace-scoped for now**, user-scoped later. The later version needs a visibility marker on the chat row *plus* `authorizedByUserId` on the service principal — the claim alone describes the caller, not the resource. Keep `chats.user_id` as `created_by` during the workspace migration rather than dropping it, or private chats can never be introduced without having lost who created each existing one. Include `authorized_by` in the service principal's claims now (free, and makes the eventual policy a pure SQL change).

## Kysely — direct Postgres data access — spec not written

Replace PostgREST (`supabase.from(...)`) with a direct Postgres connection and a typed query builder, keeping GoTrue for authentication. Motivation is **expressiveness, not per-query latency**: three related reads are currently three HTTP requests because PostgREST can't express the join, filters are built as untyped strings (`workbench.database.ts` → `.or('user_id.eq.X,is_public.eq.true')`), and window functions — needed for per-workflow execution retention — can't be written at all without dropping to an RPC. Migrate opportunistically per file; the data layer already takes a handle as a parameter, so it is the routing seam.

- [ ] **backend:** two pools, neither exported directly. `rlsPool` connects as a role that is **not the table owner and has no `BYPASSRLS`** — only plain grants. Policies then apply to every query on it unconditionally, so forgetting a scope yields **zero rows** (a loud dev failure) rather than an unscoped read. `servicePool` connects as the elevated role and is the equivalent of today's `createServiceClient()`.
- [ ] **backend:** expose only the two scope functions, named deliberately un-parallel so the dangerous one feels different: `asUser(principal, fn)` (or `withRls`) and `withServiceRole(reason, fn)`. The mandatory `reason` makes every bypass greppable — the thing `createServiceClient()` fails at today, since an intentional bypass and an accidental one look identical at the call site.
- [ ] **backend:** set the session context in **one statement** per transaction (two `set_config` calls in a single `select`), not two round trips. Use `set_config(name, value, true)` rather than `SET LOCAL` — `SET` accepts no bind parameters, so it would force interpolating a user-derived value into SQL. **The third argument must be `true`**: session-scoped (`false`) leaves the identity on the connection for whoever the pool hands it to next.
- [ ] **backend:** use **transaction-mode** pooling (Supabase pooler port 6543), not session mode — `SET LOCAL` unwinds at `COMMIT`, which is what makes connection sharing safe. Verify on the real setup that `set_config(..., true)` genuinely does not survive the transaction; that assumption is load-bearing.
- [ ] **decided — explicit scopes, not ambient.** `AsyncLocalStorage` would remove the parameter threading (`db()` resolving the current request's transaction anywhere in the call chain), but a function needing a scope would not say so in its signature, and the failure is at runtime. Explicit is a near-zero diff from the current shape: `this.database.publish(principal.supabase, payload)` becomes `asUser(principal, trx => this.database.publish(trx, payload))`.
- [ ] **convention — a scope wraps database work, not a method.** Only queries and pure computation go inside; anything awaiting another system goes outside. **Tell: if a call takes a timeout argument, it does not belong in a scope.** Natural ordering is (1) permission check on the service pool, (2) external wait with no scope, (3) database work in a user scope. Read → external call → write is simply two scopes with the wait between them.
- [ ] **backend:** apply the convention to the Execution control methods (`pause`/`resume`/`suspend`/`terminate`). Each does permission check → `realtime.signalAndAwaitEvent` (blocks until a **worker** acknowledges) → status update. Wrapping the whole method holds a pooled connection across a round trip to another process; with a pool of ten, ten concurrent requests exhaust it. Scope only the final `database.update`.
- [ ] **backend:** `runCore` splits into three. The pre-enqueue writes (`chat.ensure` + `executions.create` + credential fetch) are the one place that genuinely wants a multi-statement transaction; `executionQueue.add` and `realtime.awaitEvent(..., 10_000)` must sit outside it; the failure-path status update is its own small scope. This trades atomicity across the yield — an execution row can exist with no job behind it — which the existing `catch` already compensates for by writing `status: 'failed'`. Redis cannot participate in a Postgres transaction, so no scope width makes that atomic.
- [ ] **backend:** `WorkbenchService.field.resourceLoader.loadOptions` has the same shape and is already correctly ordered — the `listByIds` read precedes the third-party `loaderFn` call, so the scope sits around just the read.
- [ ] **note:** nesting is not currently possible. Only services open scopes (data-layer methods receive a handle), and the sole service-to-service DB call is `PermissionService`, which runs on the service pool — a separate connection, not a nested transaction. Preserve that: services call the data layer, not each other, from inside a scope.
- [ ] **note:** a transaction is not a batch. Each `await` inside one is still its own round trip, and `Promise.all` on a `trx` serializes (one connection processes one statement at a time) — unlike `Promise.all` on the pool, which is genuinely concurrent. Round trips are reduced by writing one statement instead of three (joins, CTEs, `insert ... returning`), not by grouping.

## Execution signal router — [spec](SPECS/execution-signal-router.md)

- [x] **shared:** split `Execution/event-base.ts` out of `event.ts` — `Channel`, `getChannel`, `Base` (+ type alias), `Unstamped`, and `defineEventFactory`. Imports `../Workflow/ids` rather than the `Workflow` barrel, which reaches back through `Workflow/node.ts → Webhook.ts`. `event.ts` re-exports all of it, so `Execution.Event.Base` / `.getChannel` resolve unchanged at every call site. Breaks `event.ts → session.ts → Consultation.ts → event.ts`; `signal.ts` was already a leaf and needed nothing.
- [x] **shared:** `defineEventFactory(Schema)` replaces the hand-written `OfType`/`Provided`/`Rest`/`RestArg`/`create` block, which was already duplicated. `Execution.Event`, `Consultation.Event`, and `Webhook.Test.Event` all run on it. A factory returns an **`Unstamped`** member — minus `channel`/`executionId`/`workflowId` — and only `emit` can mint a whole event.
- [x] **shared:** deleted `Execution.Event.Origin`. Every `create(type, ctx, rest)` call site drops its second argument (8 in `worker/src/engine/*`, 7 in `worker.ts`).
- [x] **shared:** `Execution.Signal.Base` narrows `channel` to the branded `Signal.Channel` and gains a `Base` type alias for the router's generic bound.
- [x] **shared:** `Execution.Event.ConsultationResolved` → `Consultation.Event.Resolved`, filling the empty namespace the domain already reserved, with its own `Schema` and `create`. `Execution.Event.Schema` loses it and gains nothing — **no union is assembled centrally**. `Consultation.Signal` drops its own `Channel`/`getChannel` and rebases on `Execution.Signal.Base`.
- [x] **shared:** added `Consultation.UnstampedRequest<T>` — distributive `Omit<T, "id" | "startedAt">`, so a domain extending `Request` (HumanReview) keeps its own props through `consult`. Non-distributive `Omit` collapses a union to its common keys.
- [x] **worker:** `RealtimeService` → `SharedRealtimeService`, one per process, single public method `scope(executionId, workflowId)`. Also ends the name collision with the backend class of the same name. `RealtimeScope extends RealtimeAPI` + `withAbort` + `close`.
- [x] **worker:** the scope replaces both demultiplexers. `worker.ts`'s `signalHandlersMap` + `redisSub` are gone — two subscriber connections became one, two registries one, two dispatch models one. `redisPub` stays for the recording cache (a `SET`, not a publish).
- [x] **worker:** dispatch parses `Execution.Signal.Base`, cross-checks `executionId`, then per registration applies its own schema (the `z.literal` on `type` is the type filter) and its `match` (the correlation filter). Unmatched → **ignored, never rejected**.
- [x] **worker:** `emit` stamps `channel`/`executionId`/`workflowId` from the bound execution instead of trusting the caller. Stamping beats asserting — a node cannot address another execution because it never writes those fields. Correctness boundary, not a security one: node code is first-party and can import the service directly.
- [x] **worker:** `awaitSignalAfter(schema, match, timeout, action)` — registers, *then* triggers, and unregisters if the trigger throws. Subsumes `emitAndAwaitSignal`, which is dropped rather than ported. `match` is a **required positional parameter**: optional would silently reintroduce "same-type signal resolves every waiter of that type".
- [x] **worker:** `scope.withAbort(abortSignal)` is how `createExecutionAPIs` binds cancellation — the scope is created in `worker.ts` before the AbortController exists, and a sub-workflow shares the parent scope (same execution id, one subscription, one `close()`) while keeping its own abort.
- [x] **worker:** 10 tests in `realtime.test.ts` over the three historical failure modes plus emit stamping, cross-execution rejection, `awaitSignalAfter` ordering + throw, `close`, and `withAbort`. Full suite 16/16.
- [x] **worker:** `consult` renders the card from *inside* `awaitSignalAfter`, closing the window where an instant answer landed before the waiter existed, and matches on `consultationId`.
- [x] **backend:** `consultation.service.ts` publishes to `Execution.Signal.getChannel(executionId)`; the acknowledgement cast becomes `Consultation.Event.Resolved`.
- [x] **frontend:** `handle-events.ts` annotations widen to `Execution.Event | Consultation.Event`, inline — the reducer is the one place that unionises, and only at the type level.
- [x] **nodes:** `Core/Workbench/Review` finished onto `consultationAPI.consult`. One branch per variant, each awaiting only the resolution it can use, so a wrong-shaped answer fails in `consult`'s parse instead of reaching the ports. Requests parse against the variant's own schema with `id`/`startedAt` omitted — the Json-backed fields (`options`, `formFields`) hold whatever the user typed.
- [x] **nodes:** `Core/Chat/Input` wraps its `Webhook.Test.API.register` in `awaitSignalAfter`. The register is an awaited HTTP call, so the old gap was a full round trip wide.
- [ ] **`Consultation.Variant` is branded, which blocks discriminated narrowing.** `z.literal(Variant.Confirm)` yields `string & $brand<...>`, not a unit type, so `switch (resolution.variant)` narrows to `never` — the cause of the pre-existing `HumanReviewSDK` card errors. Sidestepped in the Review node by parsing per variant; the frontend still needs it resolved. Either unbrand `Variant` or narrow some other way.
- [ ] **`respond()` still does not validate that the consultation is real.** `consultationId` is unverified, so a signal can be published for one that was never parked. Under the shared channel it lands and is ignored rather than vanishing into an unsubscribed channel — both silent. Asserting it against the execution's pending consultations belongs in `respond()`.
- [ ] **nothing emits `Execution.Event.Suspended`.** `ExecutionService.suspend` awaits it, always times out, returns `success: false`, and never writes `status: 'suspended'` — though the abort does fire, so the execution really does stop.
- [ ] **`abortAPI.abort()` does not unwind a paused engine.** The engine gates on a `pausePromise` only `resume()` resolves. `onPauseTimeout` pairs `abort()` with `resume()` for exactly this reason; the `terminate` and `suspend` cases in `handleSignal` do not, so terminating or suspending a paused execution stalls until the five-minute pause timeout.
