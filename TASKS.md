# vxAgentEditor — Task Board

> Legend: 🔴 Design Decision · 🟡 Implementation · 🟢 Micro-task
> Status: [ ] Todo · [x] Done · [~] In Progress · [!] Blocked

---

## 🛡️ Bucket 1 — Hardening
> Things that will break real users right now. Do these first.

- [ ] 🟡 **Wire cycle limit enforcement** — `EXECUTION_CYCLE_LIMIT_EXCEEDED` (code 2006) exists in error codes but is never enforced in the engine. Add a configurable max-iterations counter to S2 execution state.
- [ ] 🟡 **Add deadlock timeout to S2 engine** — if `activeTasks > 0` and no vertex fires for N seconds, abort with a timeout error. Currently the engine hangs forever on a broken exit condition.
- [ ] 🟡 **Retry logic for transient node errors** — rate limits and API timeouts currently fail the whole job permanently. Add configurable retry with exponential backoff for `PROVIDER_RATE_LIMITED` and `EXECUTION_TIMEOUT` error codes.
- [ ] 🟡 **Fix undo/redo** — `TEMPORAL_STACK_SIZE = 1` in WorkbenchSDK means only the last state is tracked. Raise to a sensible default (e.g. 50) and verify Zundo is working correctly.
- [ ] 🔴 **Decide: node failure scope** — currently one node error kills the entire workflow. Decide whether errors should be branch-isolated (only kill downstream of the failed node) or keep the current fail-all behavior. Document the decision here.

### Deployment Blockers
- [ ] 🟢 **Env-ify Redis config** — `REDIS_HOST = "localhost"` and `REDIS_PORT = 6379` are hardcoded in `shared/constants.ts` with no `process.env` fallback. Will fail in any containerized or remote deployment.
- [ ] 🟢 **Env-ify WebSocket URL** — `RealtimeSDK.connect("ws://localhost:3001")` is a hardcoded module-level call in `frontend/src/SDKs/Realtime/sdk.ts:162`. Should read from `VITE_WS_URL` or similar.
- [ ] 🟢 **Add `.env.example` files** — no `.env.example` exists in any package. Document all required env vars for `backend`, `worker`, and `frontend`.

---

## 🧹 Bucket 2 — Code Quality
> Type safety, separation of concerns, dead code. No user-facing impact but reduce future bugs.

### TypeScript Type Safety _(spec: `SPECS/typescript-type-safety.md`)_
- [ ] 🟢 **Narrow `setValue` action types** — `field.setValue` and `input.setValue` both accept `value: any`. Add generic value types so the compiler checks values against field/input variants. (`WorkbenchSDK/actions.ts:130,134`)
- [ ] 🟢 **Remove temporal store `as any` cast** — override `useStore` in `WorkbenchSDKImpl` with the `TemporalStore` type from zundo so `.temporal` is typed without casting. (`WorkbenchSDK/actions.ts:69-70`, `sdk.ts`)
- [ ] 🟢 **Consolidate 6 Immer discriminated union casts** — replace `(input as any).variant` and `(output as any).variant` with a single `setVariant()` helper. (`WorkbenchSDK/reducers/node.ts:215-245`)
- [ ] 🟢 **Remove reconcile field ID `as any` casts** — type `changedFieldId` as `string` and drop the three `"provider" as any`, `"model" as any`, `"apiKey" as any` casts. (`worker/nodes/Core/LanguageModel/reconcile.ts:14-16`)
- [ ] 🟢 **Narrow synthesizer return types** — change `synthesizeInput` and `ensureReference` return types from `any` to a proper union. (`worker/src/synthesizer/index.ts`)

### Naming & Package Hygiene
- [ ] 🟢 **Fix `shared/package.json` main entry** — `"main": "index.ts"` is non-standard. Should point to a compiled output or use `exports` with `ts-node`/path mappings explicitly documented.

### Separation of Concerns
- [ ] 🟢 **Delete debug/test panels** — remove `testPanel.tsx` (NotificationSDK), `debugPanel.tsx` (DialogSDK), and the dead `StateViewer` component + `useSDKState` hook in `workflow/$workflowid.tsx`. None are behind feature flags.
- [ ] 🟢 **Split `Canvas/props.ts`** — file mixes static config, a utility function, and React Flow event callbacks (a controller). Split into `config.ts`, `utils.ts`, and `callbacks.ts`.
- [ ] 🔴 **Fix `ChatSDKImpl` constructor side effects** — constructor calls `QuerySDK` and subscribes to `RealtimeSDK` directly, making initialization order implicit. Move to an explicit `init()` method or lazy subscription.

---

## 🔧 Bucket 3 — Completion
> Planned and half-built features. The previous dev left scaffolding for all of these.

- [ ] 🟢 **Add iteration counter to execution session state** — track how many times each node has fired. Required for cycle limit enforcement and Accumulator overflow detection.

---

## 🚀 Bucket 4 — Growth
> New capabilities. Don't touch until Bucket 1 is mostly done.

- [ ] 🔴 **Design the ReAct workflow pattern** — finalize the canonical Accumulator + Merge(OR) + Router pattern. Build a template workflow users can start from.
- [ ] 🟡 **Cycle visualization on canvas** — cycles in the graph can become visually confusing. Add a visual indicator (e.g. loop badge on edges) so users can see which edges form a cycle.
- [ ] 🔴 **Checkpoint / partial resume** — after a failure at step 8 of 10, the whole job restarts. Design a checkpointing strategy using `node_outputs` already stored in the session.
- [ ] 🟡 **Execution history / replay** — store completed execution sessions so users can review past runs, inspect node outputs, and debug failures.
- [ ] 🔴 **Worker horizontal scaling strategy** — currently a single worker process. Design queue partitioning or multiple worker instances for scale.

---

## 📖 Bucket 5 — Documentation
> The codebase has zero docs. This is a risk for future work.

- [ ] 🟢 **Document S2 engine** — write an explanation of signal accumulation, AND/OR/XOR strategies, ignite flow, and cycle handling. Lives in `packages/worker/src/S2/README.md`.
- [ ] 🟢 **Write node implementation guide** — how to create a new node: blueprint schema, `@RegisterNode` decorator, `onRun()` contract, input/output types. Lives in `packages/worker/src/nodes/README.md`.
- [ ] 🟢 **Architecture overview** — high-level diagram + explanation of the 6 packages, data flow from canvas → compiler → S2 engine → WebSocket → frontend. Lives in `docs/architecture.md`.

---

## ✅ Done

- [x] 🟡 **Rename package identifiers to PretzelGraph** — all packages now use `@pretzel-graph/` consistently.
- [x] 🟢 **Deduplicate `resolveFields()`** — extracted to `worker/src/utils.ts`; compiler imports from there.
- [x] 🟡 **Implement Accumulator node** — blueprint + runtime in `packages/nodes/src/Core/Routing/Accumulator/`.
- [x] 🟡 **Implement Pause/Resume** — `engine.ts` has real `pause()`/`resume()` with promise-based freeze; `worker.ts` routes `case "pause"` and `case "resume"` to it.
- [x] 🟡 **Surface errors on canvas nodes** — `node:error` WebSocket event is handled in `ExecutionSessionSDK/sdk.tsx:69`.
- [x] 🟢 **Clean up `research/` package** — package deleted.

---

## 🗒️ Decisions Log

> Record design decisions here so context is never lost.

| Date | Decision | Rationale |
|------|----------|-----------|
| — | — | — |
