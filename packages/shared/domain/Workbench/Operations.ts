import type { Foundations } from "../Foundations"
import type { Validation } from "../Validation"
import type { Workflow } from "../Workflow"
import { Document, type DeriveResult } from "./Document"

type Position   = { x: number, y: number }
type Connection = Document.DriverConnection

const { withCyclesRecompute } = Document

// What can be asked of a workflow document, in the terms a caller uses. Shaped like the
// canvas's actions: a namespace per target, a method per operation, the document first.
//
// Writes mirror what the canvas does around a reducer — derive on a reconciling field,
// validate, recompute cycles once edges moved — so a headless edit lands in the same state a
// human's would. Reads return projections, not dumps.
export namespace Operations {
    type NodeIssues = Validation.Issue.Node | null

    export interface NodeSummary {
        id:          Workflow.Node.Id
        blueprintId: Foundations.Blueprint.Id
        displayName: string
        isDisabled:  boolean
        hasIssues:   boolean
    }

    export interface EdgeSummary {
        id:     Workflow.Edge.Id
        source: Workflow.Edge["source"]
        target: Workflow.Edge["target"]
    }

    export interface WorkflowProjection {
        id:     Workflow.Id
        nodes:  NodeSummary[]
        edges:  EdgeSummary[]
        issues: Validation.Issue.Workflow
    }

    export interface ConnectedEdges {
        incoming: Record<Foundations.Port.Input.Id,  Workflow.Edge.Id[]>
        outgoing: Record<Foundations.Port.Output.Id, Workflow.Edge.Id[]>
    }

    export interface NodeProjection {
        node:           Workflow.Node.Raw
        fields:         readonly Foundations.Field[]
        inputs:         readonly Foundations.Port.Input[]
        outputs:        readonly Foundations.Port.Output[]
        staticValues:   Record<string, unknown> | null
        connectedEdges: ConnectedEdges
        issues:         NodeIssues
    }

    // Filters AND together; an omitted one matches everything. Neighbourhood filters are one
    // hop: `upstreamOf` is the nodes that feed the given ones, `downstreamOf` the nodes they feed.
    export interface NodeQuery {
        ids?:          Workflow.Node.Id[]
        blueprintIds?: Foundations.Blueprint.Id[]
        displayName?:  string
        upstreamOf?:   Workflow.Node.Id[]
        downstreamOf?: Workflow.Node.Id[]
        limit?:        number
    }

    export interface EdgeQuery {
        nodeIds?:       Workflow.Node.Id[]
        sourceNodeIds?: Workflow.Node.Id[]
        targetNodeIds?: Workflow.Node.Id[]
        limit?:         number
    }

    export interface QueryResult<T> {
        items: T[]
        /** How many matched before `limit`. */
        total: number
    }

    export interface NodeLayout {
        id:          Workflow.Node.Id
        displayName: string
        position:    Position
        /** Estimated from the node's shape; the canvas measures the real thing. */
        size:        { width: number, height: number }
    }

    export interface LayoutProjection {
        nodes:  NodeLayout[]
        bounds: { minX: number, minY: number, maxX: number, maxY: number } | null
    }

    export interface WorkflowOperations {
        get:        (d: Document) => WorkflowProjection
        queryNodes: (d: Document, query: NodeQuery) => QueryResult<NodeSummary>
        queryEdges: (d: Document, query: EdgeQuery) => QueryResult<EdgeSummary>
        layout:     (d: Document) => LayoutProjection
    }

    // Global fields: the workflow's own inputs, shown when it runs as a sub-workflow node and
    // read inside it through the workflow config. Only the scalar variants the settings panel
    // offers; a spec is what a caller writes, a field is what the document stores.
    export type GlobalFieldVariant = "String" | "Boolean" | "Integer" | "Float"

    export interface GlobalFieldSpec {
        id:            Foundations.Field.Id
        displayName:   string
        variant:       GlobalFieldVariant
        required?:     boolean
        tooltip?:      string
        initialValue?: string | number | boolean
        min?:          number
        max?:          number
        multiline?:    boolean
    }

    export interface GlobalFieldOperations {
        list:   (d: Document) => readonly Foundations.Field[]
        add:    (d: Document, spec: GlobalFieldSpec) => { field: Foundations.Field }
        update: (d: Document, fieldId: Foundations.Field.Id, patch: Partial<Omit<GlobalFieldSpec, "id">>) => { field: Foundations.Field }
        remove: (d: Document, fieldId: Foundations.Field.Id) => { fieldId: Foundations.Field.Id }
    }

    const createGlobalField = (spec: GlobalFieldSpec): Foundations.Field => {
        const base = {
            id:          spec.id,
            displayName: spec.displayName,
            advanced:    false,
            required:    spec.required ?? false,
            reconcile:   false,
            description: "",
            tooltip:     spec.tooltip,
        }

        switch (spec.variant) {
            case "Boolean": return { ...base, variant: "Boolean", initialValue: Boolean(spec.initialValue ?? false) }
            case "Integer": return { ...base, variant: "Integer", initialValue: Math.trunc(Number(spec.initialValue ?? 0)), min: spec.min, max: spec.max }
            case "Float":   return { ...base, variant: "Float",   initialValue: Number(spec.initialValue ?? 0), min: spec.min, max: spec.max }
            case "String":  return { ...base, variant: "String",  initialValue: String(spec.initialValue ?? ""), multiline: spec.multiline ?? false }
        }
    }

    // The canvas renders a node 250px wide with one row per port; close enough to plan around.
    const NODE_WIDTH    = 250
    const HEADER_HEIGHT = 56
    const PORT_ROW      = 28
    const PADDING       = 16

    const estimateSize = (d: Document, nodeId: Workflow.Node.Id) => {
        const shape = d.cache.resolvedShape[nodeId]
        const rows  = Math.max(shape?.inputs.length ?? 0, shape?.outputs.length ?? 0)

        return { width: NODE_WIDTH, height: HEADER_HEIGHT + rows * PORT_ROW + PADDING }
    }

    const DEFAULT_LIMIT = 50

    const summarizeNode = (d: Document, node: Workflow.Node.Raw): NodeSummary => ({
        id:          node.id,
        blueprintId: node.blueprintId,
        displayName: d.selectors.node.getUI(d, node.id).displayName,
        isDisabled:  node.isDisabled ?? false,
        hasIssues:   !!d.issues.nodes[node.id],
    })

    const summarizeEdge = (edge: Workflow.Edge): EdgeSummary => ({
        id:     edge.id,
        source: edge.source,
        target: edge.target,
    })

    const paginate = <T>(items: T[], limit = DEFAULT_LIMIT): QueryResult<T> => ({
        items: items.slice(0, limit),
        total: items.length,
    })

    const connectedEdges = (d: Document, nodeId: Workflow.Node.Id): ConnectedEdges => {
        const incoming: ConnectedEdges["incoming"] = {}
        const outgoing: ConnectedEdges["outgoing"] = {}

        for (const edge of Object.values(d.cache.edges)) {
            if (edge.target.nodeId === nodeId)
                (incoming[edge.target.portId] ??= []).push(edge.id)

            if (edge.source.nodeId === nodeId)
                (outgoing[edge.source.portId] ??= []).push(edge.id)
        }

        return { incoming, outgoing }
    }

    export interface NodeOperations {
        get:    (d: Document, nodeId: Workflow.Node.Id) => NodeProjection
        create: (d: Document, blueprint: Foundations.Blueprint, position: Position, staticValues?: Record<string, unknown>) => { nodeId: Workflow.Node.Id, issues: NodeIssues }
        delete: (d: Document, nodeId: Workflow.Node.Id) => { nodeId: Workflow.Node.Id }
        move:   (d: Document, nodeId: Workflow.Node.Id, position: Position) => { nodeId: Workflow.Node.Id, position: Position }
    }

    export interface EdgeOperations {
        create: (d: Document, connection: Connection) => { edgeId: Workflow.Edge.Id }
        delete: (d: Document, edgeId: Workflow.Edge.Id) => { edgeId: Workflow.Edge.Id }
    }

    export interface FieldOperations {
        get: (d: Document, nodeId: Workflow.Node.Id, fieldId: Foundations.Field.Id) => { value: Foundations.Field.Value | null }
        set: (d: Document, nodeId: Workflow.Node.Id, fieldId: Foundations.Field.Id, value: unknown) => { nodeId: Workflow.Node.Id, fieldId: Foundations.Field.Id, issues: NodeIssues, derivation: DeriveResult | null }
    }

    export const workflow: WorkflowOperations = {
        get: (d: Document) => ({
            id:     d.workflowId,
            nodes:  Object.values(d.data.nodes).map(node => summarizeNode(d, node)),
            edges:  Object.values(d.cache.edges).map(summarizeEdge),
            issues: d.issues,
        }),

        queryNodes: (d: Document, query: NodeQuery) => {
            const ids          = query.ids          && new Set(query.ids)
            const blueprintIds = query.blueprintIds && new Set(query.blueprintIds)
            const needle       = query.displayName?.trim().toLowerCase()

            const upstream = query.upstreamOf && new Set(
                query.upstreamOf.flatMap(id => Object.keys(d.cache.incomingEdgesMap[id] ?? {}) as Workflow.Node.Id[]),
            )
            const downstream = query.downstreamOf && new Set(
                query.downstreamOf.flatMap(id => Object.keys(d.cache.outgoingEdgesMap[id] ?? {}) as Workflow.Node.Id[]),
            )

            const matches = Object.values(d.data.nodes)
                .map(node => summarizeNode(d, node))
                .filter(node =>
                    (!ids          || ids.has(node.id)) &&
                    (!blueprintIds || blueprintIds.has(node.blueprintId)) &&
                    (!needle       || node.displayName.toLowerCase().includes(needle)) &&
                    (!upstream     || upstream.has(node.id)) &&
                    (!downstream   || downstream.has(node.id)),
                )

            return paginate(matches, query.limit)
        },

        queryEdges: (d: Document, query: EdgeQuery) => {
            const nodeIds       = query.nodeIds       && new Set(query.nodeIds)
            const sourceNodeIds = query.sourceNodeIds && new Set(query.sourceNodeIds)
            const targetNodeIds = query.targetNodeIds && new Set(query.targetNodeIds)

            const matches = Object.values(d.cache.edges)
                .filter(edge =>
                    (!nodeIds       || nodeIds.has(edge.source.nodeId) || nodeIds.has(edge.target.nodeId)) &&
                    (!sourceNodeIds || sourceNodeIds.has(edge.source.nodeId)) &&
                    (!targetNodeIds || targetNodeIds.has(edge.target.nodeId)),
                )
                .map(summarizeEdge)

            return paginate(matches, query.limit)
        },

        layout: (d: Document) => {
            const nodes = Object.values(d.data.nodes).map(node => ({
                id:          node.id,
                displayName: d.selectors.node.getUI(d, node.id).displayName,
                position:    d.data.ui.layout[node.id] ?? { x: 0, y: 0 },
                size:        estimateSize(d, node.id),
            }))

            const bounds = nodes.length === 0 ? null : {
                minX: Math.min(...nodes.map(n => n.position.x)),
                minY: Math.min(...nodes.map(n => n.position.y)),
                maxX: Math.max(...nodes.map(n => n.position.x + n.size.width)),
                maxY: Math.max(...nodes.map(n => n.position.y + n.size.height)),
            }

            return { nodes, bounds }
        },
    }

    export const globalField: GlobalFieldOperations = {
        list: (d: Document) => d.data.fields,

        add: (d: Document, spec: GlobalFieldSpec) => {
            if (d.data.fields.some(f => f.id === spec.id))
                throw new Error(`Global field ${spec.id} already exists`)

            const field = createGlobalField(spec)

            d.reducers.workflow.setFields(d, [...d.data.fields, field])
            return { field }
        },

        update: (d: Document, fieldId: Foundations.Field.Id, patch: Partial<Omit<GlobalFieldSpec, "id">>) => {
            const current = d.data.fields.find(f => f.id === fieldId)
            if (!current)
                throw new Error(`Global field ${fieldId} not found`)

            // Rebuilt from the merged spec so a variant change starts from that variant's defaults.
            const field = createGlobalField({
                id:           fieldId,
                displayName:  patch.displayName  ?? current.displayName,
                variant:      patch.variant      ?? current.variant as GlobalFieldVariant,
                required:     patch.required     ?? current.required,
                tooltip:      patch.tooltip      ?? current.tooltip,
                initialValue: patch.initialValue ?? ("initialValue" in current ? current.initialValue as GlobalFieldSpec["initialValue"] : undefined),
                min:          patch.min          ?? ("min"       in current ? current.min       : undefined),
                max:          patch.max          ?? ("max"       in current ? current.max       : undefined),
                multiline:    patch.multiline    ?? ("multiline" in current ? current.multiline : undefined),
            })

            d.reducers.workflow.setFields(d, d.data.fields.map(f => f.id === fieldId ? field : f))
            return { field }
        },

        remove: (d: Document, fieldId: Foundations.Field.Id) => {
            if (!d.data.fields.some(f => f.id === fieldId))
                throw new Error(`Global field ${fieldId} not found`)

            d.reducers.workflow.setFields(d, d.data.fields.filter(f => f.id !== fieldId))
            return { fieldId }
        },
    }

    export const node: NodeOperations = {
        get: (d: Document, nodeId: Workflow.Node.Id) => {
            const node = d.data.nodes[nodeId]
            if (!node)
                throw new Error(`Node ${nodeId} not found`)

            const shape = d.cache.resolvedShape[nodeId]

            return {
                node,
                fields:         shape?.fields  ?? [],
                inputs:         shape?.inputs  ?? [],
                outputs:        shape?.outputs ?? [],
                staticValues:   d.selectors.node.getStaticValues(d, nodeId),
                connectedEdges: connectedEdges(d, nodeId),
                issues:         d.issues.nodes[nodeId] ?? null,
            }
        },

        create: withCyclesRecompute((d: Document, blueprint: Foundations.Blueprint, position: Position, staticValues?: Record<string, unknown>) => {
            const nodeId = d.reducers.node.create(d, blueprint, position, staticValues as never)
            return { nodeId, issues: d.issues.nodes[nodeId] ?? null }
        }),

        delete: withCyclesRecompute((d: Document, nodeId: Workflow.Node.Id) => {
            if (!d.data.nodes[nodeId])
                throw new Error(`Node ${nodeId} not found`)

            d.reducers.node.remove(d, nodeId)
            return { nodeId }
        }),

        move: (d: Document, nodeId: Workflow.Node.Id, position: Position) => {
            if (!d.data.nodes[nodeId])
                throw new Error(`Node ${nodeId} not found`)

            d.reducers.layout.node.setPosition(d, nodeId, position)
            return { nodeId, position }
        },
    }

    export const edge: EdgeOperations = {
        create: withCyclesRecompute((d: Document, connection: Connection) => {
            const edge = d.reducers.edge.create(d, connection)
            if (!edge)
                throw new Error("Edge not created: a port was not found or the types do not match")

            return { edgeId: edge.id }
        }),

        delete: withCyclesRecompute((d: Document, edgeId: Workflow.Edge.Id) => {
            if (!d.cache.edges[edgeId])
                throw new Error(`Edge ${edgeId} not found`)

            d.reducers.edge.remove(d, edgeId)
            return { edgeId }
        }),
    }

    export const field: FieldOperations = {
        get: (d: Document, nodeId: Workflow.Node.Id, fieldId: Foundations.Field.Id) => ({
            value: d.selectors.node.getStaticValue(d, nodeId, fieldId),
        }),

        set: withCyclesRecompute((d: Document, nodeId: Workflow.Node.Id, fieldId: Foundations.Field.Id, value: unknown) => {
            const field = d.selectors.field.get(d, nodeId, fieldId)
            if (!field)
                throw new Error(`Field ${fieldId} not found on node ${nodeId}`)

            // A reconciling field reshapes the node; what that added, removed, and disconnected
            // comes back so the caller can see the cost of the change.
            const derivation = field.reconcile
                ? d.reducers.node.derive(d, nodeId, { ...d.selectors.field.getValues(d, nodeId), [fieldId]: value as never })
                : null

            d.reducers.field.setValue(d, nodeId, fieldId, value as never)
            d.reducers.node.validate(d, nodeId)

            return { nodeId, fieldId, issues: d.issues.nodes[nodeId] ?? null, derivation }
        }),
    }
}
