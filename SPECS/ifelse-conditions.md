# Spec: IfElse Node — Condition Evaluation

## Motivation

The IfElse node exists but has no real condition logic — it just does `Boolean(condition)`. For the ReAct agent pattern (and any branching workflow), users need to evaluate conditions against incoming data. The "has tool calls?" diamond in the ReAct diagram is the canonical use case.

Incoming data can be a LangChain `AIMessage`, a plain JS object, `Data`, or anything the Unresolved port resolves to. We need a way to inspect properties of that data and route accordingly.

## Design

### Condition Model

Structured triples, not raw expressions. Same principle as n8n but simpler — no sandboxed JS, just path + operator + value.

```ts
type Operator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "greater_than"
  | "less_than"
  | "is_empty"
  | "is_not_empty"
  | "is_true"
  | "is_false"
  | "exists"

type Condition = {
  path: string       // dot-path into the data: "tool_calls.length", "content", "status"
  operator: Operator
  value?: string     // right-hand side (absent for unary operators like is_empty)
}

type ConditionGroup = {
  combinator: "AND" | "OR"
  conditions: Condition[]
}
```

A single ConditionGroup is evaluated: all conditions AND'd or OR'd together. Result is boolean → routes to `true` or `false` output port.

### Path Resolution

Use a safe dot-path accessor (no eval). Works on both plain objects and class instances (LangChain messages have enumerable properties).

```ts
function resolvePath(obj: unknown, path: string): unknown {
  const keys = path.split(".");
  let current: any = obj;
  for (const key of keys) {
    if (current == null) return undefined;
    current = current[key];
  }
  return current;
}
```

This handles:
- `"content"` → `aiMessage.content`
- `"tool_calls.length"` → `aiMessage.tool_calls.length`
- `"tool_calls.0.name"` → first tool call's name
- `"additional_kwargs.tool_calls"` → nested property access

### Operator Evaluation

```ts
function evaluateCondition(data: unknown, condition: Condition): boolean {
  const value = resolvePath(data, condition.path);

  switch (condition.operator) {
    case "equals":         return String(value) === condition.value;
    case "not_equals":     return String(value) !== condition.value;
    case "contains":       return String(value).includes(condition.value ?? "");
    case "not_contains":   return !String(value).includes(condition.value ?? "");
    case "greater_than":   return Number(value) > Number(condition.value);
    case "less_than":      return Number(value) < Number(condition.value);
    case "is_empty":       return value == null || value === "" || (Array.isArray(value) && value.length === 0);
    case "is_not_empty":   return value != null && value !== "" && !(Array.isArray(value) && value.length === 0);
    case "is_true":        return Boolean(value) === true;
    case "is_false":       return Boolean(value) === false;
    case "exists":         return value !== undefined;
  }
}
```

### Group Evaluation

```ts
function evaluateGroup(data: unknown, group: ConditionGroup): boolean {
  if (group.conditions.length === 0) return true;

  if (group.combinator === "AND")
    return group.conditions.every(c => evaluateCondition(data, c));
  else
    return group.conditions.some(c => evaluateCondition(data, c));
}
```

### Error Behavior

- Path doesn't exist → `resolvePath` returns `undefined`
- `undefined` with `is_empty` → true
- `undefined` with `equals "something"` → false (since `"undefined" !== "something"`)
- No special error throwing — conditions are lenient by design

## Affected Files

### Worker (Runtime)

**`packages/worker/src/nodes/Core/Routing/IfElse/blueprint.ts`**
- Replace `FieldBuilder.String({ id: "condition" })` with `FieldBuilder.Json({ id: "conditionGroup" })` storing a serialized `ConditionGroup`
- Or introduce a new `FieldBuilder.ConditionGroup` if a custom field type is warranted (see Open Questions)

**`packages/worker/src/nodes/Core/Routing/IfElse/node.ts`**
- Import/implement `resolvePath`, `evaluateCondition`, `evaluateGroup`
- Parse the `conditionGroup` field
- Evaluate against `inputs.input`
- Route to `true` or `false`

**New: `packages/worker/src/nodes/Core/Routing/IfElse/conditions.ts`**
- Pure utility module with the types and evaluation functions
- Easily testable in isolation

### Shared (Types)

**`packages/shared/domain/Foundations.ts`** (optional)
- If we want the `Condition`, `ConditionGroup`, `Operator` types shared between frontend and worker, define them here
- If only the worker needs them, keep them local to the IfElse node

### Frontend (UI) — Phase 2

**Condition editor component**
- Renders a table of condition rows: path field | operator dropdown | value field
- AND/OR toggle for the group combinator
- Path field autocomplete: reads the resolved port variant + last execution output to suggest available keys

**Field renderer integration**
- New field type `"ConditionGroup"` registered in FieldRenderer so the IfElse node renders the condition editor inline or in a drawer

## Implementation Order

### Phase 1: Runtime (worker only)
1. Create `conditions.ts` with types + evaluation functions
2. Update blueprint to use `FieldBuilder.Json` for the condition group field
3. Implement evaluation in `node.ts`
4. Write tests for the evaluation logic (edge cases: undefined paths, empty arrays, type coercion)

### Phase 2: Frontend condition editor
1. Define shared types in `Foundations.ts` (Operator, Condition, ConditionGroup)
2. Build `ConditionEditor` component (table of rows + combinator toggle)
3. Register new field type in FieldRenderer
4. Implement path autocomplete from upstream node schema / last execution output

### Phase 3: Path autocomplete
1. When a node finishes execution, pin its output shape to the session
2. Frontend reads the pinned shape of upstream nodes to suggest keys
3. For known LangChain types (AIMessage, HumanMessage, etc.), provide static key hints

## Open Questions

1. **Field type**: Use `FieldBuilder.Json` (quick, stores serialized JSON) or create a new `FieldBuilder.ConditionGroup` (cleaner but more work)? Recommend Json for Phase 1, dedicated type for Phase 2.

2. **Multiple condition groups**: Should the IfElse support multiple groups (e.g., Group1 OR Group2, where each group is internally AND'd)? n8n supports this. Start with a single group for now.

3. **Expression mode toggle**: Should there be a "power user" mode where the user can type a raw safe expression instead of using structured triples? Defer this — structured UI first.

4. **ReAct example condition**: "has tool calls?" would be configured as:
   ```json
   {
     "combinator": "AND",
     "conditions": [
       { "path": "tool_calls", "operator": "is_not_empty" }
     ]
   }
   ```

## Tasks for TASKS.md

- [ ] 🟡 **IfElse condition evaluation runtime** — implement `conditions.ts` evaluation logic, update blueprint + node.ts. Write tests.
- [ ] 🟢 **Define Condition/Operator types in shared** — add to Foundations.ts for frontend/worker sharing
- [ ] 🟡 **ConditionEditor frontend component** — table UI for condition rows with operator dropdown and path input
- [ ] 🟡 **Register ConditionGroup field type in FieldRenderer** — so IfElse node renders the editor
- [ ] 🟢 **Path autocomplete from execution output** — pin output shapes and suggest keys in the condition editor
