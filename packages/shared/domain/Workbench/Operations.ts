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

    export interface WorkflowProjection {
        id:     Workflow.Id
        nodes:  Array<{ id: Workflow.Node.Id, blueprintId: Foundations.Blueprint.Id, displayName: string, isDisabled: boolean }>
        edges:  Array<{ id: Workflow.Edge.Id, source: Workflow.Edge["source"], target: Workflow.Edge["target"] }>
        issues: Validation.Issue.Workflow
    }

    export interface NodeProjection {
        node:         Workflow.Node.Raw
        fields:       readonly Foundations.Field[]
        inputs:       readonly Foundations.Port.Input[]
        outputs:      readonly Foundations.Port.Output[]
        staticValues: Record<string, unknown> | null
        issues:       NodeIssues
    }

    export interface WorkflowOperations {
        get: (d: Document) => WorkflowProjection
    }

    export interface NodeOperations {
        get:    (d: Document, nodeId: Workflow.Node.Id) => NodeProjection
        create: (d: Document, blueprint: Foundations.Blueprint, position: Position, staticValues?: Record<string, unknown>) => { nodeId: Workflow.Node.Id, issues: NodeIssues }
        delete: (d: Document, nodeId: Workflow.Node.Id) => { nodeId: Workflow.Node.Id }
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
            id: d.workflowId,
            nodes: Object.values(d.data.nodes).map(node => ({
                id:          node.id,
                blueprintId: node.blueprintId,
                displayName: d.selectors.node.getUI(d, node.id).displayName,
                isDisabled:  node.isDisabled ?? false,
            })),
            edges: Object.values(d.cache.edges).map(edge => ({
                id:     edge.id,
                source: edge.source,
                target: edge.target,
            })),
            issues: d.issues,
        }),
    }

    export const node: NodeOperations = {
        get: (d: Document, nodeId: Workflow.Node.Id) => {
            const node = d.data.nodes[nodeId]
            if (!node)
                throw new Error(`Node ${nodeId} not found`)

            const shape = d.cache.resolvedShape[nodeId]

            return {
                node,
                fields:       shape?.fields  ?? [],
                inputs:       shape?.inputs  ?? [],
                outputs:      shape?.outputs ?? [],
                staticValues: d.selectors.node.getStaticValues(d, nodeId),
                issues:       d.issues.nodes[nodeId] ?? null,
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
