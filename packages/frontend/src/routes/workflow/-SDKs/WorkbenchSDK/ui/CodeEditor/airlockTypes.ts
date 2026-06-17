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
        const edge = data.edges[edgeId as Workflow.Edge.Id]
        if (!edge) return
        const value = execution.session.node_output_projections[edge.source.nodeId]?.[
            edge.source.portId as Foundations.Port.Output.Id
        ]
        if (value !== undefined) result[targetPortId] = value
    })

    return result
}

// Object type with the workflow's real node ids as literal keys → id autocomplete.
function keyedByNodeIds(ids: Workflow.Node.Id[], valueType: string, extraKeys: string[] = []): string {
    const keys = [...ids.map((id) => `${JSON.stringify(id)}: ${valueType}`), ...extraKeys]
    return keys.length ? `{ ${keys.join('; ')} }` : 'Record<string, never>'
}

export function buildAirlockDts(nodeId: Workflow.Node.Id): string {
    const ids = Object.keys(WorkbenchSDK.state.data.nodes) as Workflow.Node.Id[]
    const configKey = `${JSON.stringify(WorkflowDomain.WORKFLOW_CONFIG_NODE_ID)}: Record<string, any>`

    return [
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
        `declare const $config: Record<string, any>;`,
        `declare const $igniter: any;`,
        `declare const $chatId: string | undefined;`,
    ].join('\n')
}
