import { z } from 'zod'
import { WorkbenchSDK } from '@/routes/workflow/-SDKs/WorkbenchSDK/sdk'
import { ExecutionSDK } from '@/routes/workflow/-SDKs/ExecutionSDK/sdk'
import { Foundations, Workflow as WorkflowDomain, type Workflow } from '@pretzel-graph/shared/domain'
import { Document } from '@pretzel-graph/shared/domain/Workbench/Document'

const MAX_DEPTH = 8
const MAX_ARRAY_SAMPLE = 20

const isIdent = (k: string) => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(k)
const key = (k: string) => (isIdent(k) ? k : JSON.stringify(k))

// JS value → TS type string, primitives widened (string/number/boolean).
export function tsValueType(value: unknown, depth = 0): string {
    if (value === null) return 'null'
    if (value === undefined) return 'undefined'

    const t = typeof value
    if (t === 'string') return 'string'
    if (t === 'number' || t === 'bigint') return 'number'
    if (t === 'boolean') return 'boolean'
    if (t === 'function') return 'Function'
    if (depth >= MAX_DEPTH) return 'any'

    if (Array.isArray(value)) {
        if (value.length === 0) return 'unknown[]'
        const elems = Array.from(
            new Set(value.slice(0, MAX_ARRAY_SAMPLE).map((v) => tsValueType(v, depth + 1))),
        )
        return `(${elems.join(' | ')})[]`
    }

    if (t === 'object') {
        const entries = Object.entries(value as Record<string, unknown>)
        if (entries.length === 0) return 'Record<string, never>'
        const body = entries.map(([k, v]) => `${key(k)}: ${tsValueType(v, depth + 1)}`).join('; ')
        return `{ ${body} }`
    }

    return 'any'
}

type JsonSchema = {
    type?: string
    anyOf?: JsonSchema[]
    properties?: Record<string, JsonSchema>
    required?: string[]
    items?: JsonSchema
    additionalProperties?: JsonSchema | boolean
}

// JSON schema (as emitted by z.toJSONSchema) → TS type string.
function jsonSchemaType(schema: JsonSchema): string {
    if (schema.anyOf)
        return schema.anyOf.map(jsonSchemaType).join(' | ')

    switch (schema.type) {
        case 'string':
        case 'number':
        case 'boolean':
        case 'null':
            return schema.type
        case 'integer':
            return 'number'
        case 'array':
            return `(${schema.items ? jsonSchemaType(schema.items) : 'any'})[]`
        case 'object': {
            const entries = Object.entries(schema.properties ?? {})
            if (entries.length === 0) {
                const extra = schema.additionalProperties
                return typeof extra === 'object' ? `Record<string, ${jsonSchemaType(extra)}>` : 'object'
            }
            const required = new Set(schema.required ?? [])
            const body = entries.map(([k, v]) => `${key(k)}${required.has(k) ? '' : '?'}: ${jsonSchemaType(v)}`).join('; ')
            return `{ ${body} }`
        }
        default:
            return 'any'
    }
}

const projectionType = (schema: z.ZodType) => jsonSchemaType(z.toJSONSchema(schema) as JsonSchema)

// Port variant → TS type of its projected value.
const PORT_VARIANT_TS: Partial<Record<Foundations.Port.Variant, string>> = {
    Message:       projectionType(Foundations.Projection.Message),
    MessageList:   projectionType(Foundations.Projection.MessageList),
    Document:      projectionType(Foundations.Projection.Document),
    Tool:          projectionType(Foundations.Projection.Tool),
    ToolList:      projectionType(Foundations.Projection.ToolList),
    LanguageModel: projectionType(Foundations.Projection.LanguageModel),
    Embeddings:    projectionType(Foundations.Projection.Embeddings),
    Retriever:     'object',
    VectorStore:   'object',
    Text:          'string',
    SkillList:     'any[]',
    DataList:      'any[]',
    UnresolvedList:'any[]',
}

// Variants whose value is free-form, so the last run's value refines the type.
const SAMPLED_VARIANTS = new Set<Foundations.Port.Variant>([
    'Data', 'DataList', 'Unresolved', 'UnresolvedScalar', 'UnresolvedList',
])

function getIncomingData(nodeId: Workflow.Node.Id): Record<string, unknown> {
    const session = ExecutionSDK.state.currentExecution?.session
    return Document.selectors.execution.getNodeIncomingData(WorkbenchSDK.document, nodeId, session) ?? {}
}

// `$in` type: one key per input port, typed by variant, refined by the last run for free-form ports.
export function getIncomingType(nodeId: Workflow.Node.Id): string {
    const doc = WorkbenchSDK.document
    const inputs = doc.selectors.node.ports.getInputs(doc, nodeId)
    if (inputs.length === 0) return 'Record<string, never>'

    const incoming = getIncomingData(nodeId)

    const entries = inputs.map((port) => {
        const sample = incoming[port.id]
        const type = SAMPLED_VARIANTS.has(port.variant) && sample !== undefined
            ? tsValueType(sample)
            : PORT_VARIANT_TS[port.variant] ?? 'any'
        const comment = port.displayName ? `/** ${port.displayName} */ ` : ''
        return `${comment}${key(port.id)}: ${type}`
    })

    return `{ ${entries.join('; ')} }`
}

// Element type for `$item` in item-scoped fields. If exactly one incoming port carries an
// array, `$item` is typed as that array's element (sampled) — driving real autocomplete; when
// it's ambiguous (zero or many incoming arrays) or empty, falls back to `any`.
export function getItemType(nodeId: Workflow.Node.Id): string {
    const arrays = Object.values(getIncomingData(nodeId)).filter(Array.isArray) as unknown[][]
    if (arrays.length !== 1 || arrays[0].length === 0) return 'any'

    const elems = Array.from(
        new Set(arrays[0].slice(0, MAX_ARRAY_SAMPLE).map((v) => tsValueType(v, 1))),
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

// Object type built from the workflow's global fields → `$globalFields` key autocomplete.
// Mirrors the runtime bag Airlock.resolveGlobalFieldValues produces (field id → value).
export function getGlobalFieldsType(): string {
    const fields = WorkbenchSDK.document.data.globalFields ?? []
    if (fields.length === 0) return 'Record<string, any>'

    const entries = fields.map((field) => {
        const variant = (field as { variant?: Foundations.Field.Variant }).variant
        const type =
            (variant && VARIANT_TS[variant]) ??
            ('initialValue' in field ? tsValueType((field as { initialValue?: unknown }).initialValue, 1) : 'any')
        return `${key(field.id)}: ${type}`
    })

    return `{ ${entries.join('; ')} }`
}

// Object type with the workflow's real node ids as literal keys → id autocomplete.
function keyedByNodeIds(ids: Workflow.Node.Id[], valueType: string, extraKeys: string[] = []): string {
    const keys = [...ids.map((id) => `${JSON.stringify(id)}: ${valueType}`), ...extraKeys]
    return keys.length ? `{ ${keys.join('; ')} }` : 'Record<string, never>'
}

// `itemScoped` is set when editing a field declared via defineField.itemScoped — only then are
// `$item` / `$itemIndex` in scope (the node binds them per-element at runtime), so they're
// surfaced in autocomplete exclusively for those fields.
export function buildAirlockDts(nodeId: Workflow.Node.Id, options?: { itemScoped?: boolean }): string {
    const ids = Object.keys(WorkbenchSDK.document.data.nodes) as Workflow.Node.Id[]
    const globalFieldsKey = `${JSON.stringify(WorkflowDomain.GLOBAL_FIELDS_NODE_ID)}: ${getGlobalFieldsType()}`

    const lines = [
        `interface WorkflowNode {`,
        `    id: string;`,
        `    blueprintId: string;`,
        `    fields: { id: string; value?: any;[k: string]: any }[];`,
        `    inputs: { id: string;[k: string]: any }[];`,
        `    outputs: { id: string;[k: string]: any }[];`,
        `    isDisabled?: boolean;`,
        `}`,
        `declare const $in: ${getIncomingType(nodeId)};`,
        `declare const $node: WorkflowNode;`,
        `declare const $workflow: {`,
        `    id: string;`,
        `    nodes: ${keyedByNodeIds(ids, 'WorkflowNode')};`,
        `    staticValues: ${keyedByNodeIds(ids, 'Record<string, any>', [globalFieldsKey])};`,
        `    edges: Record<string, { source: { nodeId: string; portId: string }; target: { nodeId: string; portId: string } }>;`,
        `    credentialInstanceIds: Record<string, string>;`,
        `};`,
        `declare const $globalFields: ${getGlobalFieldsType()};`,
        `declare const $igniter: any;`,
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
