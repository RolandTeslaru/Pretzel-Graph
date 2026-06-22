import { Field } from "./Foundations/Field"
import { Workflow } from "./Workflow"

// Pure compile-time layer (no isolated-vm): $key registry + sigil rewrite + brands.
// Pipeline: Source → parse() → ParsedSource → ivm.Script → value
export namespace Airlock {

    export namespace Source {
        export type Expression = string & { readonly __brand: "AirlockExpression" }
        export type Code = string & { readonly __brand: "AirlockCode" }
        export const asExpression = (s: string) => s as Expression
        export const asCode = (s: string) => s as Code
    }
    export type Source = Source.Expression | Source.Code

    export type ParsedSource = string & { readonly __brand: "AirlockParsedString" }
    // Re-thrown by nodes (never swallowed): OOM disposed the shared isolate.
    export const TERMINATION_ERROR_NAME = "AirlockTerminationError"

    export const GLOBALS = {
        workflow: "__workflow__",
        igniter:  "__igniter__",
        chatId:    "__chatId__",
        in:        "__in__",
        item:      "__item__",
        itemIndex: "__item_index__",
        nodeId:    "__node_id__",
        globals:   "__globals__",
    } as const

    const CONFIG_NODE_KEY = Workflow.WORKFLOW_CONFIG_NODE_ID

    const STATIC_ROOTS: Record<string, string> = {
        workflow: GLOBALS.workflow,
        config:   `${GLOBALS.workflow}.staticValues[${JSON.stringify(CONFIG_NODE_KEY)}]`,
        igniter:  GLOBALS.igniter,
        chatId:   GLOBALS.chatId,
        in:        GLOBALS.in,
        item:      GLOBALS.item,
        itemIndex: GLOBALS.itemIndex,
        node:      `${GLOBALS.workflow}.nodes[${GLOBALS.nodeId}]`,
        // Execution-scoped mutable scratch. `$nodeGlobals` is `$globals[<this node id>]`,
        // auto-created (`??= {}`) so reads/writes never hit undefined.
        globals:     GLOBALS.globals,
        nodeGlobals: `(${GLOBALS.globals}[${GLOBALS.nodeId}] ??= {})`,
    }

    // Matches $root at a word boundary; rewrites only the root, leaving member access intact.
    // `itemIndex` precedes `item`, and `nodeGlobals` precedes `node`, so the longer root wins.
    const SIGIL = /\$(workflow|config|igniter|chatId|in|itemIndex|item|nodeGlobals|node|globals)\b/g

    export function rewrite(source: Source): string {
        return source.replace(SIGIL, (_m, root: string) => STATIC_ROOTS[root])
    }

    export type CoerceTo = "boolean" | "number" | "string"

    const COERCE_FN: Record<CoerceTo, string> = {
        boolean: "Boolean",
        number:  "Number",
        string:  "String",
    }

    // Self-invoking sync IIFE returning the (optionally coerced) value.
    // The body is wrapped as an argument/parenthesized expression, so a trailing
    // statement `;` (e.g. the ASI semicolon ts.transpileModule appends) must be
    // stripped first — `Boolean(x;)` is a syntax error.
    export function parseExpression(expr: Source.Expression, coerceTo?: CoerceTo): ParsedSource {
        const rewritten = rewrite(expr).trim().replace(/;+$/, "")
        const inner = coerceTo ? `${COERCE_FN[coerceTo]}(${rewritten})` : `(${rewritten})`
        return `(function(){ return ${inner}; })()` as ParsedSource
    }

    // Async fn-expression; $in / $node id bind to params (per-call, can't clobber). Caller applies it.
    export function parseCode(code: Source.Code): ParsedSource {
        return `(async (${GLOBALS.in}, ${GLOBALS.nodeId}) => { ${rewrite(code)} })` as ParsedSource
    }

    export function coerceTargetForVariant(variant: Field.Variant): CoerceTo | undefined {
        switch (variant) {
            case "Integer":
            case "Float":
                return "number"
            case "Boolean":
                return "boolean"
            case "String":
            case "UniqueString":
            case "Password":
            case "Secret":
            case "MultiOption":
            case "File":
            case "Script":
                return "string"
            default:
                return undefined
        }
    }

    export type EvaluateFn = (expr: Source.Expression, coerceTo?: CoerceTo) => unknown

    // Rebind transient globals (e.g. $item) mid-block, within the same atomic executeSync run.
    // Keys are tracked and cleared when the block exits; reserved persistent globals are rejected.
    export type SetTransientFn = (globals: Record<string, unknown>) => void

    export interface API {
        // Set globals, run synchronously, clear — atomic on the single worker thread.
        // `setTransient` lets the run callback rebind per-iteration globals (item loops) in-block.
        executeSync<T>(globals: Record<string, unknown>, run: (evaluate: EvaluateFn, setTransient: SetTransientFn) => T): T
        // Run code-mode source async; `incoming` is passed as $in (the fn param), copied per call.
        executeAsyncCode(code: Source.Code, nodeId: Workflow.Node.Id, incoming: unknown): Promise<unknown>
    }
}
