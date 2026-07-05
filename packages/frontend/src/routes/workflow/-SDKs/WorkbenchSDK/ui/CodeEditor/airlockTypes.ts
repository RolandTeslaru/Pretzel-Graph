import { WorkbenchSDK } from '@/routes/workflow/-SDKs/WorkbenchSDK/sdk'
import { ExecutionSDK } from '@/routes/workflow/-SDKs/ExecutionSDK/sdk'
import { Workflow as WorkflowDomain, type Foundations, type Workflow } from '@pretzel-graph/shared/domain'

const MAX_DEPTH = 8
const MAX_ARRAY_SAMPLE = 20

const isIdent = (k: string) => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(k)
const key = (k: string) => (isIdent(k) ? k : JSON.stringify(k))

// JS value → TS literal type string (numbers/strings/booleans as literals).
export function tsLiteralType(value: unknown, depth = 0): string {
    if (value === null) return 'null'
    if (value === undefined) return 'undefined'

    const t = typeof value
    if (t === 'string') return JSON.stringify(value)
    if (t === 'number' || t === 'bigint') return String(value)
    if (t === 'boolean') return String(value)
    if (t === 'function') return 'Function'
    if (depth >= MAX_DEPTH) return 'any'

    if (Array.isArray(value)) {
        if (value.length === 0) return 'unknown[]'
        const elems = Array.from(
            new Set(value.slice(0, MAX_ARRAY_SAMPLE).map((v) => tsLiteralType(v, depth + 1))),
        )
        return `(${elems.join(' | ')})[]`
    }

    if (t === 'object') {
        const entries = Object.entries(value as Record<string, unknown>)
        if (entries.length === 0) return 'Record<string, never>'
        const body = entries.map(([k, v]) => `${key(k)}: ${tsLiteralType(v, depth + 1)}`).join('; ')
        return `{ ${body} }`
    }

    return 'any'
}

// Same projection the IncomingPanel renders: { [targetPortId]: lastRunValue }.
export function getIncomingShape(nodeId: Workflow.Node.Id): Record<string, unknown> {
    const execution = ExecutionSDK.state.currentExecution
    if (!execution) return {}

    const { cache, data } = WorkbenchSDK.state
    const result: Record<string, unknown> = {}

    Object.entries(cache.inputHandlesMap[nodeId] ?? {}).forEach(([targetPortId, edgeId]) => {
        const edge = cache.edges[edgeId as Workflow.Edge.Id]
        if (!edge) return
        const value = execution.session.node_output_projections[edge.source.nodeId]?.[
            edge.source.portId as Foundations.Port.Output.Id
        ]
        if (value !== undefined) result[targetPortId] = value
    })

    return result
}

// Element type for `$item` in item-scoped fields. If exactly one incoming port carries an
// array, `$item` is typed as that array's element (sampled) — driving real autocomplete; when
// it's ambiguous (zero or many incoming arrays) or empty, falls back to `any`.
export function getItemType(nodeId: Workflow.Node.Id): string {
    const arrays = Object.values(getIncomingShape(nodeId)).filter(Array.isArray) as unknown[][]
    if (arrays.length !== 1 || arrays[0].length === 0) return 'any'

    const elems = Array.from(
        new Set(arrays[0].slice(0, MAX_ARRAY_SAMPLE).map((v) => tsLiteralType(v, 1))),
    )
    return elems.join(' | ')
}

// Field variant → TS primitive. Anything not listed falls back to its initialValue
// shape (or `any`), so List/Json/MultiOption etc. still get a best-effort type.
const VARIANT_TS: Partial<Record<Foundations.Field.Variant, string>> = {
    Integer: 'number',
    Float: 'number',
    String: 'string',
    UniqueString: 'string',
    Password: 'string',
    Secret: 'string',
    Script: 'string',
    Boolean: 'boolean',
}

// Object type built from the workflow's config fields → `$config` key autocomplete.
// Mirrors the runtime bag Airlock.resolveWorkflowConfig produces (field id → value).
export function getConfigType(): string {
    const fields = WorkbenchSDK.state.data.fields ?? []
    if (fields.length === 0) return 'Record<string, any>'

    const entries = fields.map((field) => {
        const variant = (field as { variant?: Foundations.Field.Variant }).variant
        const type =
            (variant && VARIANT_TS[variant]) ??
            ('initialValue' in field ? tsLiteralType((field as { initialValue?: unknown }).initialValue, 1) : 'any')
        return `${key(field.id)}: ${type}`
    })

    return `{ ${entries.join('; ')} }`
}

// Object type with the workflow's real node ids as literal keys → id autocomplete.
function keyedByNodeIds(ids: Workflow.Node.Id[], valueType: string, extraKeys: string[] = []): string {
    const keys = [...ids.map((id) => `${JSON.stringify(id)}: ${valueType}`), ...extraKeys]
    return keys.length ? `{ ${keys.join('; ')} }` : 'Record<string, never>'
}

// `itemScoped` is set when editing a field declared via FieldBuilder.itemScoped — only then are
// `$item` / `$itemIndex` in scope (the node binds them per-element at runtime), so they're
// surfaced in autocomplete exclusively for those fields.
export function buildAirlockDts(nodeId: Workflow.Node.Id, options?: { itemScoped?: boolean }): string {
    const ids = Object.keys(WorkbenchSDK.state.data.nodes) as Workflow.Node.Id[]
    const configKey = `${JSON.stringify(WorkflowDomain.WORKFLOW_CONFIG_NODE_ID)}: ${getConfigType()}`

    const lines = [
        `interface WorkflowNode {`,
        `    id: string;`,
        `    blueprintId: string;`,
        `    fields: { id: string; value?: any;[k: string]: any }[];`,
        `    inputs: { id: string;[k: string]: any }[];`,
        `    outputs: { id: string;[k: string]: any }[];`,
        `    isDisabled?: boolean;`,
        `}`,
        `declare const $in: ${tsLiteralType(getIncomingShape(nodeId))};`,
        `declare const $node: WorkflowNode;`,
        `declare const $workflow: {`,
        `    id: string;`,
        `    nodes: ${keyedByNodeIds(ids, 'WorkflowNode')};`,
        `    staticValues: ${keyedByNodeIds(ids, 'Record<string, any>', [configKey])};`,
        `    edges: Record<string, { source: { nodeId: string; portId: string }; target: { nodeId: string; portId: string } }>;`,
        `    credentialInstanceIds: Record<string, string>;`,
        `};`,
        `declare const $config: ${getConfigType()};`,
        `declare const $igniter: any;`,
        `declare const $chatId: string | undefined;`,
        // Execution-scoped mutable scratch. Values are set at runtime and can be anything
        // (objects, functions, class instances), so they're untyped — these just need to exist.
        `declare const $globals: Record<string, any>;`,
        `declare const $nodeGlobals: Record<string, any>;`,
    ]

    if (options?.itemScoped) {
        lines.push(`declare const $item: ${getItemType(nodeId)};`)
        lines.push(`declare const $itemIndex: number;`)
    }

    return lines.join('\n')
}
