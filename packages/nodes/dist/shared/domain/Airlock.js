"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Airlock = void 0;
const Workflow_1 = require("./Workflow");
var Airlock;
(function (Airlock) {
    let Source;
    (function (Source) {
        Source.asExpression = (s) => s;
        Source.asCode = (s) => s;
    })(Source = Airlock.Source || (Airlock.Source = {}));
    // Re-thrown by nodes (never swallowed): OOM disposed the shared isolate.
    Airlock.TERMINATION_ERROR_NAME = "AirlockTerminationError";
    Airlock.Globals = {
        WORKFLOW: "__workflow__",
        IGNITER: "__igniter__",
        IN: "__in__",
        ITEM: "__item__",
        ITEM_INDEX: "__item_index__",
        NODE_ID: "__node_id__",
        GLOBALS: "__globals__",
        METRICS: "__metrics__",
    };
    const CONFIG_NODE_KEY = Workflow_1.Workflow.WORKFLOW_CONFIG_NODE_ID;
    const STATIC_ROOTS = {
        workflow: Airlock.Globals.WORKFLOW,
        igniter: Airlock.Globals.IGNITER,
        in: Airlock.Globals.IN,
        item: Airlock.Globals.ITEM,
        itemIndex: Airlock.Globals.ITEM_INDEX,
        globals: Airlock.Globals.GLOBALS,
        metrics: Airlock.Globals.METRICS,
        config: `${Airlock.Globals.WORKFLOW}.staticValues[${JSON.stringify(CONFIG_NODE_KEY)}]`,
        node: `${Airlock.Globals.WORKFLOW}.nodes[${Airlock.Globals.NODE_ID}]`,
        nodeGlobals: `(${Airlock.Globals.GLOBALS}[${Airlock.Globals.NODE_ID}] ??= {})`,
    };
    // Matches $root at a word boundary; rewrites only the root, leaving member access intact.
    // `itemIndex` precedes `item`, and `nodeGlobals` precedes `node`, so the longer root wins.
    const SIGIL = /\$(workflow|config|igniter|in|itemIndex|item|nodeGlobals|node|globals|metrics)\b/g;
    function rewrite(source) {
        return source.replace(SIGIL, (_m, root) => STATIC_ROOTS[root]);
    }
    Airlock.rewrite = rewrite;
    const COERCE_FN = {
        boolean: "Boolean",
        number: "Number",
        string: "String",
    };
    // Self-invoking sync IIFE returning the (optionally coerced) value.
    // The body is wrapped as an argument/parenthesized expression, so a trailing
    // statement `;` (e.g. the ASI semicolon ts.transpileModule appends) must be
    // stripped first — `Boolean(x;)` is a syntax error.
    function parseExpression(expr, coerceTo) {
        const rewritten = rewrite(expr).trim().replace(/;+$/, "");
        const inner = coerceTo ? `${COERCE_FN[coerceTo]}(${rewritten})` : `(${rewritten})`;
        return `(function(){ return ${inner}; })()`;
    }
    Airlock.parseExpression = parseExpression;
    // Async fn-expression; $in / $node id bind to params (per-call, can't clobber). Caller applies it.
    function parseCode(code) {
        return `(async (${Airlock.Globals.IN}, ${Airlock.Globals.NODE_ID}) => { ${rewrite(code)} })`;
    }
    Airlock.parseCode = parseCode;
    function coerceTargetForVariant(variant) {
        switch (variant) {
            case "Integer":
            case "Float":
                return "number";
            case "Boolean":
                return "boolean";
            case "String":
            case "UniqueString":
            case "Password":
            case "Secret":
            case "MultiOption":
            case "File":
            case "Script":
                return "string";
            default:
                return undefined;
        }
    }
    Airlock.coerceTargetForVariant = coerceTargetForVariant;
    function resolveWorkflowConfig(workflowData) {
        const config = {};
        const overrides = workflowData.staticValues[Workflow_1.Workflow.WORKFLOW_CONFIG_NODE_ID] ?? {};
        for (const field of workflowData.fields ?? []) {
            if (field.id in overrides)
                config[field.id] = overrides[field.id];
            else if ("initialValue" in field)
                config[field.id] = field.initialValue;
        }
        return config;
    }
    Airlock.resolveWorkflowConfig = resolveWorkflowConfig;
    function toWorkflowView(workflowId, data) {
        const { ui, dependencies, ...normalized } = data;
        return {
            id: workflowId,
            fields: normalized.fields,
            nodes: normalized.nodes,
            edges: normalized.edges,
            credentialInstanceIds: normalized.credentialInstanceIds,
            staticValues: {
                ...normalized.staticValues,
                [Workflow_1.Workflow.WORKFLOW_CONFIG_NODE_ID]: resolveWorkflowConfig(data),
            },
        };
    }
    Airlock.toWorkflowView = toWorkflowView;
})(Airlock || (exports.Airlock = Airlock = {}));
