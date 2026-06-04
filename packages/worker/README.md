# Worker — Execution Engine

How PretzelGraph compiles a workflow and executes it. Read this before touching `compiler/` or `engine/`.

## TL;DR

A workflow is **not** a DAG walk. It's run by **S²Engine** — a *Bulk Asynchronous Parallel Directed **Cyclical** Signal-based Graph Engine* (Pregel-like super-steps). Nodes fire when enough **signals** accumulate on them; they may fire **repeatedly** (cycles are first-class); a runaway-cycle guard stops infinite loops. Two independent dependency layers gate firing: **signal dependency** (how many upstream signals arrived) and **data dependency** (whether wired input ports actually have data).

## The pieces

| Component | File | Role |
|---|---|---|
| `S2Graph` / `Vertex` | `S2/graph.ts` | The graph: vertices (+ AND/OR/XOR strategy, runCount), arcs, `dependenciesMap`/`dependentsMap`. `__START__` is the entry vertex. |
| `S2Engine` | `S2/engine.ts` | Pure signal scheduler. Knows nothing about nodes — drives firing via signal accumulation + hooks. |
| `AggexEngine` | `engine/index.ts` | Wraps S2Engine. Maps vertices ↔ `RuntimeNode` instances, implements the hooks that actually execute nodes, and exposes `portAPI`/`propagationAPI`/`schedulerAPI`/`instanceRegistryAPI` to nodes. |
| `WorkflowCompiler` | `compiler/index.ts` | Builds the `S2Graph` + execution context, instantiates/registers nodes, wires edges, finds start nodes, handles the igniter. |
| `FlightRecorderService` | `engine/flight-recorder-service.ts` | Observability — records fired/executed/completed/failed per node. |

The engine layering is deliberate: **S2Engine is a domain-agnostic scheduler**; all node/port/workflow knowledge lives in `AggexEngine`, injected as `S2Hooks`.

---

## Phase 1 — Compile (`WorkflowCompiler.compile`)

1. Create an `S2Graph` and add the `__START__` vertex.
2. Build the execution context + all the node-facing APIs (`portAPI`, `propagationAPI`, `schedulerAPI`, `instanceRegistryAPI`, `workflowQueryAPI`, `subWorkflowAPI`, `dependencyAPI`, `credentialsAPI`) — each delegates into `AggexEngine` with the engine execution context.
3. **Per node** (`prepareNode`): resolve the `RuntimeNode` class via `CatalogueService.getNode(blueprintId)` (by blueprint-id → path convention; dependency nodes fall back to `Core.SubWorkflow.Execute`), `new` it, call `onCompile`, `graph.addVertex`, `engine.registerNode`, and set the vertex's **signal strategy** from the node's `signalDependency` field (default `AND`).
4. **Edges → dependencies**: for every non-disabled edge, `graph.addDependency(source → target)`. This builds `dependenciesMap`/`dependentsMap`.
5. **Start nodes** (`findStartNodes`): nodes with **no incoming edges** and **not `IS_PASSIVE`** → `graph.addDependency(__START__ → node)`. (No start nodes ⇒ compile error.)
6. **Igniter**: a `webhook` igniter calls `triggerWebhook` on the target node; a `chat_message` igniter calls `handleIgniter` on every node instance.
7. Return the `engineExecutionCtx`.

---

## Phase 2 — Run (`AggexEngine.run`)

Maps each S2 lifecycle event to an `AggexEngine` method via `S2Hooks`, then:

```
Promise.race(
   s2Engine.ignite(graph, hooks) → { status: "completed", duration },
   abortSignal                   → { status: "terminated", duration },
)
```

So execution ends either by the graph **settling** or by **abort**.

---

## The S² scheduling loop (`S2/engine.ts`) — the core

Each vertex owns an **`accumulatedSignals`** set (which source vertices have signaled it since it last fired).

1. **`ignite`** seeds empty signal sets and `fireVertex(__START__, {})`.
2. **`fireVertex(v, signals)`**:
   - `activeTasks++`, `onVertexFired`, `vertex.track()` (runCount++, measures delta since last run).
   - **Short-circuit guard**: if `runCount > 20` *and* the gap between runs `< 1s` → reject with `S2EngineShortCircuitError` (runaway cycle).
   - `signalSet = await onVertexExecute(v, signals)` — **this runs the node**.
   - `onVertexCompleted(v, signalSet)`, then **`fireVertexDependents(v, signalSet)`** — fired **without await** so parallel branches run concurrently.
   - `finally`: `activeTasks--`, `trySettle()`.
3. **`fireVertexDependents(v, signalSet)`**: the dependents to notify = `signalSet ?? allDependents` (a node can narrow this — that's routing). For each dependent: add `v` to its `accumulatedSignals`, then `scheduleVertexCheck`.
4. **`scheduleVertexCheck(dep)`**: debounced via a `pendingVertexChecks` set + `queueMicrotask`. On the microtask: if **`canVertexRun(dep)`**, snapshot its signals, **clear them**, and `fireVertex(dep, snapshot)`; otherwise emit `onVertexWaiting`.
5. **`canVertexRun`** (signal gate, by vertex strategy):
   - **AND** → `signals.size === dependencies.size` (all upstreams fired)
   - **OR** → `signals.size ≥ 1`
   - **XOR** → exactly 1 (more than one ⇒ `S2EngineXORCollisionError`)
   - then AND-ed with the hook `canVertexRun` (= `AggexEngine.canNodeRun`, the data gate).
6. **`trySettle`**: resolves `"completed"` when `activeTasks === 0` **and** `pendingVertexChecks` is empty.

**Manual control** (`s2Engine.overrides`, surfaced to nodes via `schedulerAPI`): `fireVertex`, `addSignal`, `removeSignal`, `clearSignals`, `scheduleCheck`. A node can drive scheduling itself (e.g. loops, fan-out, human-in-the-loop).

---

## What `AggexEngine` does on each hook

| S2 hook | AggexEngine method | Effect |
|---|---|---|
| `onVertexFired` | `onNodeFired` | Incoming edges → `completed`, outgoing edges → `preparing` (only for `"all"` propagation); `node_status: running`; emit `node:started`. |
| `onVertexExecute` | `onNodeExecuted` | **Runs the node** (see below). Returns the downstream signal set per propagation strategy. |
| `onVertexCompleted` | `onNodeCompleted` | Outgoing edges → `waiting` (+`runCount`; router → only taken branches; none → skip); `node_status: completed`; emit `node:completed` with projected output; honor pause. |
| `onVertexWaiting` | `onNodeWaiting` | `node_status: waiting`; emit `node:waiting`; call `instance.wait(partialInputs, depResolutionMap, partialFields)` so the node can react to partial inputs. |
| `onVertexError` | `onNodeError` | Wrap error, `node_status: failed`, emit `node:error`. **An error rejects the S2 promise — the whole execution terminates** (there is no per-node `continueOnFail` today). |
| `canVertexRun` | `canNodeRun` | The **data-dependency** gate (below). |

### `onNodeExecuted` — the execution heart
1. **Resolve inputs** (`node.getIncomingData`): if the node's `dataDependency === "AND"`, read from **all** dependency ports; otherwise only from the **signaling** ones. For each input port: if a wired edge's source has signaled, read `session.node_output_instances[source][port]` and `Synthesizer.ensureReference` it to the input's variant; else fall back to static value / `initialValue`.
2. **Evaluate fields**: `instance.evaluateFields(inputs)` resolves field expressions against the incoming data.
3. **Run**: `isConvertedToTool` ? `buildTool` : `run(inputs, fields)`.
4. **Persist outputs**: store raw values in `node_output_instances` and `Synthesizer.project`-ed snapshots in `node_output_projections`.
5. **Return downstream signals** by propagation strategy:
   - `"all"` → `void` (signal all dependents)
   - `"router"` → only dependents wired to output ports **present in the result** (`resolveRouterSignals`)
   - `"none"` → empty set (signal nobody; the node propagated itself via `propagationAPI`)

### `canNodeRun` — the data gate
Layered on top of the S2 signal gate. If `signalDependency === "AND"` it's a pass-through. If `dataDependency === "AND"`, it blocks until **every *wired* input port has data** — unwired optional ports are ignored. (Wired = an edge physically connects to that port.)

---

## The two-layer dependency model (the key mental model)

A node fires only when **both** are satisfied:

- **Signal dependency** (`AND`/`OR`/`XOR`) — the **S2 vertex strategy**: *how many upstream signals* must arrive. Governs control flow / cycles.
- **Data dependency** (`AND`/`OR`) — the **AggexEngine `canNodeRun` + input resolution**: whether the *data* the node needs is present, and which inputs it reads.

Both are exposed as auto-appended fields on every node (`signalDependency`, `dataDependency`).

---

## Propagation strategies (node → downstream)

Set via `RuntimeNode.getPropagationStrategy()`:
- **`"all"`** (default) — fan out to every dependent.
- **`"router"`** — fan out only to branches whose output port appears in the result (conditional routing). Edge state for non-taken branches is left untouched.
- **`"none"`** — suppress automatic fan-out; the node calls `propagationAPI.emitPort` / `emitNode` itself.

---

## Error handling & propagation (`onErrorStrategy`)

Every blueprint carries an injected `onErrorStrategy` field (alongside
`signalDependency` / `dataDependency`, via `executionStrategyFields`). When a
node's `run()`/`buildTool()` **throws**, `onNodeExecuted` catches it and branches in
`handleNodeError`:

- **`terminate`** (default) — re-throw → S2's `onVertexError` → `onNodeError`
  records `failed` and **rejects the run**. This is the historical behavior; nodes
  with no explicit strategy behave exactly as before.
- **`do_nothing`** — record `failed` + emit `node:error`, then fire **nobody**
  (return empty set). Downstream `AND`-joins stall; the engine settles as a
  **partial** run. No termination.
- **`propagate`** — mint an **error envelope** and send it down every wired
  outgoing edge (see below).

### Errors travel out-of-band

Errors do **not** ride typed output ports (that would break
`Synthesizer.project` / pollute `node_output_projections`). They ride a separate
edge-keyed channel on the context:

```ts
ctx.errorChannel: Map<Edge.Id, ErrorEnvelope>
ErrorEnvelope = { id: string; error: SystemError.Serialized; path: Node.Id[] }
```

`propagateError(nodeId, envelope)`:
1. **Cycle check** — `envelope.path.includes(nodeId)` → throw
   `CyclicalUncaughtRuntimeNodeError(path)` → terminate. (Fires on the *first*
   revisit, before the `runCount`/`delta` short-circuit guard would.)
2. **Terminal check** — no wired outgoing edges → throw
   `UncaughtRuntimeNodeError(path)` → terminate (the error was never caught).
3. Otherwise record the carrying node `failed` (so the whole path lights up),
   write the path-extended envelope onto each outgoing edge, and **return the set of
   target vertices** — reusing the same router mechanism (`fireVertexDependents`
   fires only those).

### Interception (pass-through)

At the **top** of `onNodeExecuted`, before running, `findIncomingErrorEnvelope`
checks the node's incoming edges. If an envelope is present the node does **not**
run its own logic — it consumes the envelope and either **catches** it (Catch node,
see below) or **re-propagates** it. `canNodeRun` has a matching **fail-fast**: an
incoming envelope fires the node immediately, bypassing the data gate (an
`AND`-join doesn't wait for sibling inputs that will never arrive).

`onNodeCompleted` early-returns for any node already marked `failed`, so it never
overwrites the status with `completed` — but S2 still drives the returned target
set, so propagation continues.

### Catch node (`Core.Routing.Catch`, `flags.catchesError`)

Identified by the blueprint flag (engine stays generic — no hardcoded id). On an
incoming envelope, `materializeCaughtError` writes the serialized error to the
`onError` **Data** output and fires only that branch; the envelope is consumed, so
propagation **stops here**. With no envelope it's a plain passthrough
(`input` → `passthrough`, both `Unresolved`). The `onError` port is the one
deliberate boundary where an out-of-band error becomes in-band `Data`.

### Sub-workflow boundary

`errorChannel` is per-engine, so an envelope never crosses into a parent/child run.
A sub-workflow that fails surfaces at the `SubWorkflow/Execute` node as that node's
own `onRun` throw, which then applies *its* `onErrorStrategy` — re-originating a
fresh envelope rooted at the Execute node.

---

## Execution context & node-facing APIs

The compiler builds **two** context objects over one execution (`compiler/index.ts`):
- **`RuntimeNode.ExecutionContext`** — what a node sees as `this.context`.
- **`AggexEngine.Execution.Context`** — the same fields **plus** `compiledGraph` (the `S2Graph`) and `activeNodes` (engine scheduling state). The node context is this minus the engine-internal fields.

`session` is a **live getter** on both (`get session() { return execution.session }`), so reads always reflect current state. The node-facing APIs are thin closures that delegate into `engine.<api>(engineCtx, …)`.

The surface is **tiered by intended audience** — this is a convention, not enforced by types, so honor it:

### Tier 1 — common (most nodes)
| API | Use |
|---|---|
| `credentialsAPI.getDecryptedValue(blob)` / `getInstance(id)` | read credentials |
| `emit(event)` | realtime events (streaming, progress) |
| `abortAPI.signal` / `abort()` | cancellation (+ the `this.AbortablePromise` helper) |
| `workflowQueryAPI.getNodesByBlueprint(id)` / `getNodeOutput(nodeId, portId)` | query the graph / read another node's output |
| `dependencyAPI.getPublished/getDraft(workflowId)` | resolve workflow dependencies |
| read-only `session` / `workflowData` / `workflowId` / `executionId` / `chat_id` / `workflowCache` | execution state |

### Tier 2 — output & propagation (nodes that emit beyond a plain `onRun` return)
| API | Use |
|---|---|
| `portAPI.write(nodeId, outputId, value)` | imperatively write an output (streaming / multiple writes) |
| `propagationAPI.emitPort(nodeId, outputId)` / `emitNode(nodeId)` | **blessed** manual fan-out — *maintains edge state*. Pair with `getPropagationStrategy() === "none"`. |

### Tier 3 — infrastructure / graph-plumbing nodes ONLY
> ⚠️ These manipulate the scheduler/session directly and can desync edge state, deadlock, or infinite-loop. **Integration and data nodes never need them.** In practice they're used by exactly a few first-party plumbing nodes: **Portal** (`Core/Routing/Portal`), **Expose** (`Core/SubWorkflow/Expose*`, `Core/Utils/Expose*`), and **SubWorkflow.Execute**.

| API | Use | Real consumer |
|---|---|---|
| `schedulerAPI.fireNode(nodeId, signals?)` | fire a node with **no wired edge** (teleport a signal) | Portal/In |
| `schedulerAPI.signalNode` / `removeSignal` / `clearSignals` / `scheduleCheck` | raw S2 signal manipulation | loop / junction plumbing |
| `instanceRegistryAPI.get(nodeId)` / `getAll()` | reach into other running node instances | aggregators / agents |
| `updateSession(recipe)` | mutate the session directly | engine internals — avoid in node code |
| `enclosingNodeAPI.writePort` / `emitPort` | write to the **parent** graph's ports from inside a sub-workflow | Expose / SubWorkflow boundary |
| `subWorkflowAPI.createEnv()` | compile + run a nested workflow | SubWorkflow.Execute |

**Signal-path rule:** to fan out downstream, use **`propagationAPI`** (edge-aware — it updates `edge_state`). `schedulerAPI.signalNode` is the **raw** primitive that *skips* edge bookkeeping; it's only for plumbing nodes that manage their own edge state. Don't reach for `schedulerAPI` from an integration node.

---

## Port data vs. projections

Two parallel stores in the session:
- **`node_output_instances`** — the *raw* runtime values; used to feed downstream input ports (via `Synthesizer.ensureReference`).
- **`node_output_projections`** — plain-JSON *snapshots* (via `Synthesizer.project`) for preview, routing expressions, and transport to the frontend. Validated against `Foundations.Projection.Schema`.

---

## Session state + events

Every transition mutates `execution.session` and emits a realtime `Execution.Event` on the execution's channel (`node:started`, `node:completed`, `node:waiting`, `node:error`, and `update`/`SessionUpdate`).

### `Execution.Session` schema (`shared/domain/Execution.ts`)

```ts
Session = {
    node_status:  Record<Node.Id, NodeStatus>          // default {}
    edge_state:   Record<Edge.Id, EdgeState>           // default {}
    metadata:     Record<string, any>                  // default {}
    node_output_instances:   Record<Node.Id, any>      // raw output values (any)
    node_output_projections: Record<Node.Id, Record<Port.Output.Id, Projection>>  // JSON snapshots
}

NodeStatus = {
    status: "idle" | "running" | "completed" | "waiting" | "failed"
    error?: SystemError            // populated on "failed"
    started_at?:   timestamp
    completed_at?: timestamp
}

EdgeState = {
    status: "idle" | "preparing" | "waiting" | "completed"
    runCount: number               // default 0; incremented each time the edge carries a signal
}
```

Notes: `node_output_instances` is typed `any` (raw runtime values feed downstream inputs); `node_output_projections` is the validated, transport-safe mirror. `Session.Update` is `Session.partial()` — the shape carried in `SessionUpdate` events. `createInitial()` returns an empty session.

The **edge lifecycle** is: `preparing` (source fired, output coming — `"all"` propagation only) → `waiting` (output written, signal sent downstream) → `completed` (set on the *target's* incoming edges when the target fires).

### `Workflow.Cache` (`shared/domain/Workflow.ts`)

Precomputed O(1) lookup maps, built once by `Workflow.createCache(data)` and read all over the engine (e.g. `getIncomingData`, `onNodeFired`):

```ts
Cache = {
    incomingEdgesMap: Record<Node.Id, Record<Node.Id /* source */, Edge.Id>>   // who feeds this node
    outgoingEdgesMap: Record<Node.Id, Record<Node.Id /* target */, Edge.Id>>   // who this node feeds
    inputHandlesMap:  Record<Node.Id, Record<Port.Input.Id,  Edge.Id>>         // input port → its edge
    outputHandlesMap: Record<Node.Id, Record<Port.Output.Id, Edge.Id>>         // output port → its edge
}
```

`inputHandlesMap` is how `getIncomingData` finds the edge feeding a given input port; the `EdgesMap`s drive edge-state updates and `findStartNodes` (a node absent from every `incomingEdgesMap` entry as a target = a start node).

## Pause / resume / abort / sub-workflows
- **Pause**: `pause()` sets a gate awaited after each node completes (`awaitPause`); `resume()` releases it.
- **Abort**: `abortAPI.signal`; `run()` races ignite vs abort → `"terminated"`.
- **Sub-workflows**: `subWorkflowAPI.createEnv()` spins up a nested `AggexEngine` + `WorkflowCompiler` (used by `Core.SubWorkflow.Execute`); nested nodes get an `enclosingNodeAPI` to write/emit on the parent's ports.

---

## Gotchas / invariants
- **Cycles are normal.** A vertex re-fires whenever signals re-accumulate; only the short-circuit guard (`runCount > 20` within `< 1s`) and `Vertex.MAX_RUN_COUNT = 100` stop runaways.
- **Dependents fire un-awaited** — parallelism is real; every code path checks `ctx.settled` to avoid post-resolution side effects.
- **One node error kills the run.** `onVertexError` → S2 reject. No per-node error recovery yet.
- **Signal sets are cleared on fire.** After a vertex fires, its accumulated signals reset — the next firing needs fresh signals (this is what makes cyclic re-firing well-defined).
- **`IS_PASSIVE` nodes** are excluded from `__START__` wiring — they only run when explicitly signaled/fired.
