# Spec: Foundations Refactor

## Motivation

`Foundations.ts` has three problems:

1. **The `Foundations` wrapper namespace is redundant.** The module path already communicates "these are foundational types." Consumers write `Foundations.Field.String` when they could just write `Blueprint.Field.String` — the namespace adds a prefix without adding meaning.

2. **`Field` is an overloaded name.** The project has form fields (shadcn), react-hook-form fields, XYFlow node fields, and now `Foundations.Field`. Blueprint-level field definitions need a name that can't be confused with UI field concepts.

3. **`Projection` doesn't belong next to `Blueprint` and `Port`.** It's an execution-time concern (shapes of node output values at runtime), while everything else in Foundations is a definition-time concern (how nodes are declared).

---

## Proposed File Structure

```
packages/shared/domain/
  Blueprint.ts      ← Blueprint, Field (as Blueprint.Field), Port (as Blueprint.Port)
  Projection.ts     ← Projection types (runtime output shapes)
  Foundations.ts    ← deleted (or kept as re-export shim during migration)
  index.ts          ← updated barrel
```

### Blueprint.ts

Contains everything needed to define a node:

```ts
export namespace Blueprint {
    // The node definition itself
    export const Schema = ...
    export type Schema = ...
    export const Id = ...
    export type Id = ...
    export namespace Meta { ... }

    // Field: a configurable input parameter on a node
    export namespace Field {
        export const Id = ...
        export type Id = ...
        export const Variant = ...
        export type Variant = ...
        export const Value = ...
        export type Value = ...
        export const Base = ...
        export type Base = ...
        // all field variants: String, Integer, Float, Boolean, etc.
        // Condition namespace stays nested here
        export namespace Condition { ... }
        export const Schema = ...
        export type Schema = ...
    }
    export type Field = z.infer<typeof Field.Schema>

    // Port: a connection point on a node
    export namespace Port {
        export const Id = ...
        export type Id = ...
        export const Variant = ...
        export type Variant = ...
        export const Base = ...
        export namespace Variants { ... }
        export namespace Input { ... }
        export type Input = ...
        export namespace Output { ... }
        export type Output = ...
    }
}
```

### Projection.ts

```ts
export namespace Projection {
    export const Message = ...
    export const MessageList = ...
    export const Document = ...
    export const Tool = ...
    export const LanguageModel = ...
    export const Embeddings = ...
    export const Schema = ...
}
export type Projection = z.infer<typeof Projection.Schema>
```

### index.ts (domain barrel)

```ts
export { Blueprint } from "./Blueprint"
export { Projection } from "./Projection"
export { Workflow } from "./Workflow"
// ... other domain exports
```

---

## Naming Wins

| Before | After | Why |
|--------|-------|-----|
| `Foundations.Field` | `Blueprint.Field` | Unambiguously "a field on a node blueprint", not a UI/form field |
| `Foundations.Port` | `Blueprint.Port` | Port is a blueprint concept (connection point definition), not a workflow concept |
| `Foundations.Blueprint` | `Blueprint` | One less level of nesting |
| `Foundations.Projection` | `Projection` | Separated from definition-time types |

---

## Affected Files

**69 files total** across all packages need import updates.

| Package | Files |
|---------|-------|
| shared/domain | 5 (Workflow, Workbench, Shelf, Validation, ExecutionSession) |
| backend | 1 (shelf.service) |
| worker | 28 (builders, node.ts, compiler, engine, all node reconcile files) |
| frontend | 35 (WorkbenchSDK reducers, canvas, field renderer, shelf SDK) |

The mechanical change in each file is:
```ts
// Before
import { Foundations } from "@vx-agent-editor/shared/domain"
Foundations.Field.String
Foundations.Port.Input
Foundations.Blueprint.Id

// After
import { Blueprint } from "@vx-agent-editor/shared/domain"
Blueprint.Field.String
Blueprint.Port.Input
Blueprint.Id
```

---

## Migration Strategy

To avoid a big-bang PR, migrate in stages:

1. **Create `Blueprint.ts` and `Projection.ts`** with the new structure
2. **Update `Foundations.ts` to re-export** from the new files (zero breakage)
   ```ts
   // Foundations.ts — temporary shim
   import { Blueprint, Projection } from "./index"
   export namespace Foundations {
       export import Field = Blueprint.Field
       export import Port = Blueprint.Port
       export import Blueprint = Blueprint
       export import Projection = Projection
   }
   ```
3. **Migrate packages one at a time**: worker → shared → backend → frontend
4. **Delete `Foundations.ts`** once all imports are updated

---

## Open Questions

- Should `Workflow.ts` be updated at the same time to reference `Blueprint.Field` and `Blueprint.Port` directly? It currently embeds these schemas into `Workflow.Node` — the coupling is appropriate but the names will change.
- Should `Blueprint.Port` be further split into `Blueprint.Port.Input` and `Blueprint.Port.Output` as top-level exports? Currently they're nested but heavily used independently.
- The `Condition` namespace is growing fast — is `Blueprint.Field.Condition` deep enough, or should it be `Blueprint.Field.Condition` with a separate file import behind the scenes?
