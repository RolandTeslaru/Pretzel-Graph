# Spec: TypeScript Type Safety Hardening

## Motivation

The codebase has ~74 `any` annotations. Most are harmless workarounds, but several are in
hot paths where a type mismatch would produce a silent wrong value rather than a compile
error. This spec targets the highest-impact ones only — not a blanket purge.

---

## Issues & Fixes

### 1. `setValue` actions typed as `any` — `WorkbenchSDK/actions.ts:130,134`

**Problem:** The two most-called actions in the editor accept `value: any`:
```ts
field.setValue: (nodeId, field: Foundations.Field, value: any) => void
input.setValue: (nodeId, input: Foundations.Port.Input, value: any) => void
```
There is no compile-time check that the value matches the field/input variant.

**Fix:** Add a generic `FieldValue<F extends Foundations.Field>` that maps field discriminant
to its value type, mirror for `InputValue<I extends Foundations.Port.Input>`. Thread these
through the action interface and implementation. At call sites the type will be inferred from
the field object passed in.

---

### 2. Reconcile field ID lookups cast as `any` — `worker/nodes/Core/LanguageModel/reconcile.ts:14-16`

**Problem:**
```ts
if (changedFieldId === "provider" as any) {
    const modelField = fields.get("model" as any)
    const apiKeyField = fields.get("apiKey" as any)
```
`InferFields<typeof Blueprint>` produces a keyed type but `fields` is a `Map<string, Foundations.Field>`,
so string literals don't satisfy `keyof InferFields<…>`. The `as any` bypasses this.

**Fix:** Change the `reconcile` function signature so `changedFieldId` is typed
`string` (matching what `Map.get` accepts) and annotate the `Map` as
`Map<string, Foundations.Field>` explicitly. Remove the three `as any` casts.
The `switch` on `newValue` already narrows by runtime check, which is sufficient.

---

### 3. `zundo` temporal store untyped — `WorkbenchSDK/actions.ts:69-70`

**Problem:**
```ts
(sdk.useStore as any).temporal.getState().undo()
(sdk.useStore as any).temporal.getState().redo()
```
`BaseSDK.Store<T>` is `UseBoundStore<StoreApi<T>>` which has no `temporal` property.
`WorkbenchSDKImpl` wraps its store in `temporal()` but the type isn't reflected in `BaseSDK`.

**Fix:** `BaseSDK` should not be changed — the temporal store is specific to `WorkbenchSDK`.
In `WorkbenchSDKImpl`, override `useStore` with the narrower type from zundo:
```ts
public readonly useStore: TemporalStore<WorkbenchSDK.State>
```
Then in `actions.ts`, call `sdk.useStore.temporal.getState().undo()` without casting.

---

### 4. Immer discriminated union mutation — `WorkbenchSDK/reducers/node.ts:215-245`

**Problem:** Six `(input as any).variant = …` casts are needed because `variant` is a
readonly key on a discriminated union member and Immer's draft type preserves the
discriminant constraint.

**Fix:** Extract a small typed helper:
```ts
function setVariant(port: Draft<Foundations.Port.Input | Foundations.Port.Output>, v: Foundations.Port.Variant) {
    (port as { variant: Foundations.Port.Variant }).variant = v;
}
```
This narrows the cast to one place instead of six, making the intent explicit and the
blast radius of any future type change minimal.

---

### 5. Synthesizer parameter types — `worker/src/synthesizer/index.ts`

**Problem:** `project(value: any, …)`, `projectMessage(msg: any)`, `projectDocument(doc: any)`,
`projectLanguageModel(llm: any)`, `projectEmbeddings(emb: any)`, `projectTool(t: any)`,
`synthesizeInput(input, staticValue: any): any`, `ensureReference(rawReference: any, …): any`.

These are intentional escape hatches because LC class instances come from external packages
with inconsistent types. Full elimination is not the goal.

**Fix (partial):**
- `project()` return type is already `Foundations.Projection` — that's fine.
- `synthesizeInput()` return type should be narrowed from `any` to `LC.BaseMessage | LC.Document | string | unknown[]`.
- `ensureReference()` return type should be narrowed similarly.
- The private `projectX()` methods can stay `any` since they operate on LC instances.

---

## Affected Files

| File | Change |
|---|---|
| `packages/frontend/src/SDKs/WorkbenchSDK/actions.ts` | Narrow `setValue` value types; remove temporal `as any` |
| `packages/frontend/src/SDKs/WorkbenchSDK/sdk.ts` | Override `useStore` with `TemporalStore` type |
| `packages/frontend/src/SDKs/WorkbenchSDK/reducers/node.ts` | Replace 6 `as any` casts with `setVariant` helper |
| `packages/worker/src/nodes/Core/LanguageModel/reconcile.ts` | Remove 3 `as any` field ID casts |
| `packages/worker/src/synthesizer/index.ts` | Narrow return types of `synthesizeInput` and `ensureReference` |

## Out of Scope

- `projectLanguageModel`, `projectEmbeddings` internal `Record<string, any>` — LangChain
  types are inconsistent across providers; `any` is appropriate here.
- `(input as any).variant` in Eval/HttpRequest nodes — separate error-propagation spec.
- Bulk `any` count reduction — not worth the churn without a specific bug to fix.

## Open Questions

- Does narrowing `setValue` break any existing call sites that pass dynamic values? Audit
  before merging.
- `TemporalStore` from zundo — confirm the exported type name from the installed version.
