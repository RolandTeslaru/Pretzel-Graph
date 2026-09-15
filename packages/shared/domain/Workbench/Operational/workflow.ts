import type { Workflow } from "../../Workflow"
import { Summary } from "./summary"
import type { OperationalClient } from "."

export class WorkflowOperations {

    constructor(private readonly client: OperationalClient) {}

    public get(): Summary.Workflow {
        const d = this.client.document

        return {
            id:     d.workflowId,
            nodes:  Object.values(d.data.nodes).map(node => Summary.node(d, node)),
            edges:  Object.values(d.cache.edges).map(Summary.edge),
            issues: d.issues,
        }
    }

    public queryNodes(query: Summary.NodeQuery): Summary.QueryResult<Summary.Node> {
        const d            = this.client.document
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
            .map(node => Summary.node(d, node))
            .filter(node =>
                (!ids          || ids.has(node.id)) &&
                (!blueprintIds || blueprintIds.has(node.blueprintId)) &&
                (!needle       || node.displayName.toLowerCase().includes(needle)) &&
                (!upstream     || upstream.has(node.id)) &&
                (!downstream   || downstream.has(node.id)),
            )

        return Summary.paginate(matches, query.limit)
    }

    public queryEdges(query: Summary.EdgeQuery): Summary.QueryResult<Summary.Edge> {
        const d             = this.client.document
        const nodeIds       = query.nodeIds       && new Set(query.nodeIds)
        const sourceNodeIds = query.sourceNodeIds && new Set(query.sourceNodeIds)
        const targetNodeIds = query.targetNodeIds && new Set(query.targetNodeIds)

        const matches = Object.values(d.cache.edges)
            .filter(edge =>
                (!nodeIds       || nodeIds.has(edge.source.nodeId) || nodeIds.has(edge.target.nodeId)) &&
                (!sourceNodeIds || sourceNodeIds.has(edge.source.nodeId)) &&
                (!targetNodeIds || targetNodeIds.has(edge.target.nodeId)),
            )
            .map(Summary.edge)

        return Summary.paginate(matches, query.limit)
    }

    public layout(): Summary.Layout {
        const d = this.client.document

        const nodes = Object.values(d.data.nodes).map(node => ({
            id:          node.id,
            displayName: d.selectors.node.getUI(d, node.id).displayName,
            position:    d.data.ui.layout[node.id] ?? { x: 0, y: 0 },
            size:        Summary.estimateSize(d, node.id),
        }))

        const bounds = nodes.length === 0 ? null : {
            minX: Math.min(...nodes.map(n => n.position.x)),
            minY: Math.min(...nodes.map(n => n.position.y)),
            maxX: Math.max(...nodes.map(n => n.position.x + n.size.width)),
            maxY: Math.max(...nodes.map(n => n.position.y + n.size.height)),
        }

        return { nodes, bounds }
    }
}
