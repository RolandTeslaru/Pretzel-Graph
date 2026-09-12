import { Port } from "../../Foundations/Port"
import type { Workflow } from "../../Workflow"
import { Document } from "../Document"
import { Summary } from "./summary"
import type { CreateNodeRequest, InputPortSpec, Position } from "./types"
import type { OperationalClient } from "."

const { withCyclesRecompute } = Document

const NODE_GAP = 320

// A caller with no opinion on geometry gets the next slot in a row; the canvas can tidy later.
const placeNext = (d: Document): Position => {
    const positions = Object.values(d.data.ui.layout)

    if (positions.length === 0)
        return { x: 0, y: 0 }

    const rightmost = positions.reduce((a, b) => (b.x > a.x ? b : a))

    return { x: rightmost.x + NODE_GAP, y: rightmost.y }
}

export class NodeOperations {

    constructor(private readonly client: OperationalClient) {}

    public get(nodeId: Workflow.Node.Id): Summary.NodeDetail {
        const d    = this.client.document
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
            connectedEdges: Summary.connectedEdges(d, nodeId),
            issues:         d.issues.nodes[nodeId] ?? null,
        }
    }

    // A new node starts on its base branch with plain values only. A reconciling field
    // reshapes the node, so it is set afterwards through field.set, which reports the reshape.
    public async create(request: CreateNodeRequest): Promise<{ nodeId: Workflow.Node.Id, issues: Summary.NodeIssues }> {
        const d         = this.client.getDocument()
        const blueprint = await this.client.resolveBlueprint(request.blueprintId)
        const fields    = new Map(blueprint.fields.map(f => [f.id as string, f]))
        const inputs    = new Set(blueprint.inputs.map(i => i.id as string))

        for (const id of Object.keys(request.staticValues ?? {})) {
            const field = fields.get(id)

            if (field?.reconcile)
                throw new Error(`Field ${id} reshapes the node; create it first, then set the field`)

            if (!field && !inputs.has(id))
                throw new Error(`Unknown field ${id}; the base has ${[...fields.keys()].join(", ") || "no fields"}`)
        }

        const position = request.position ?? placeNext(d)
        const nodeId   = withCyclesRecompute((d: Document) => d.reducers.node.create(d, blueprint, position, request.staticValues as never))(d)

        this.client.report({
            type:         "node:created",
            node:         d.data.nodes[nodeId],
            position:     d.data.ui.layout[nodeId],
            staticValues: d.data.staticValues[nodeId] ?? {},
        })

        return { nodeId, issues: d.issues.nodes[nodeId] ?? null }
    }

    public delete(nodeId: Workflow.Node.Id): { nodeId: Workflow.Node.Id } {
        return withCyclesRecompute((d: Document) => {
            if (!d.data.nodes[nodeId])
                throw new Error(`Node ${nodeId} not found`)

            d.reducers.node.remove(d, nodeId)
            this.client.report({ type: "node:deleted", nodeId })

            return { nodeId }
        })(this.client.getDocument())
    }

    public move(nodeId: Workflow.Node.Id, position: Position): { nodeId: Workflow.Node.Id, position: Position } {
        const d = this.client.getDocument()

        if (!d.data.nodes[nodeId])
            throw new Error(`Node ${nodeId} not found`)

        d.reducers.layout.node.setPosition(d, nodeId, position)
        this.client.report({ type: "node:moved", nodeId, position })

        return { nodeId, position }
    }

    public readonly input = {
        /** A hand-added input port: a concrete type, never an unresolved one, since it belongs to no group. */
        addPort: (nodeId: Workflow.Node.Id, spec: InputPortSpec): { nodeId: Workflow.Node.Id, port: Port.Input } => {
            const d    = this.client.getDocument()
            const node = d.data.nodes[nodeId]

            if (!node)
                throw new Error(`Node ${nodeId} not found`)

            if (node.dependencyRef)
                throw new Error(`Node ${nodeId} runs a sub-workflow; its ports are the sub-workflow's`)

            if (Port.isUnresolvedLike(spec.variant))
                throw new Error(`Port type ${spec.variant} resolves from a group; a hand-added port needs a concrete type`)

            if (d.selectors.node.getInputs(d, nodeId).some(i => i.id === spec.id))
                throw new Error(`Input port ${spec.id} already exists on ${nodeId}`)

            const port = Port.Input.Schema.parse({
                id:            spec.id,
                displayName:   spec.displayName,
                variant:       spec.variant,
                required:      spec.required ?? false,
                isAddedByUser: true,
            })

            d.reducers.port.addInput(d, nodeId, port)
            d.reducers.node.validate(d, nodeId)
            this.client.report({ type: "node:inputPortAdded", nodeId, port })

            return { nodeId, port }
        },

        removePort: (nodeId: Workflow.Node.Id, portId: Port.Input.Id): { nodeId: Workflow.Node.Id, portId: Port.Input.Id } => {
            return withCyclesRecompute((d: Document) => {
                const node = d.data.nodes[nodeId]

                if (!node)
                    throw new Error(`Node ${nodeId} not found`)

                if (!node.addedInputs?.some(p => p.id === portId))
                    throw new Error(`Input port ${portId} on ${nodeId} is not a hand-added port; only those can be removed`)

                d.reducers.port.removeInput(d, nodeId, portId)
                d.reducers.node.validate(d, nodeId)
                this.client.report({ type: "node:inputPortRemoved", nodeId, portId })

                return { nodeId, portId }
            })(this.client.getDocument())
        },
    }
}
