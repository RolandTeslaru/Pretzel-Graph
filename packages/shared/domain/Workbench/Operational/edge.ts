import type { Workflow } from "../../Workflow"
import { Validation } from "../../Validation"
import { Document } from "../Document"
import type { Connection } from "./types"
import type { OperationalClient } from "."

const { withCyclesRecompute } = Document

export class EdgeOperations {

    constructor(private readonly client: OperationalClient) {}

    public create(connection: Connection): { edgeId: Workflow.Edge.Id } {
        return withCyclesRecompute((d: Document) => {
            // The same rule the canvas applies before it lets a drag drop.
            const reason = Validation.Connection.check(connection, d.data, d.cache)
            if (reason)
                throw new Error(`Edge not created: ${reason}`)

            const edge = d.reducers.edge.create(d, connection)
            if (!edge)
                throw new Error("Edge not created")

            this.client.report({ type: "edge:created", edgeId: edge.id })

            return { edgeId: edge.id }
        })(this.client.getDocument())
    }

    public delete(edgeId: Workflow.Edge.Id): { edgeId: Workflow.Edge.Id } {
        return withCyclesRecompute((d: Document) => {
            if (!d.cache.edges[edgeId])
                throw new Error(`Edge ${edgeId} not found`)

            d.reducers.edge.remove(d, edgeId)
            this.client.report({ type: "edge:deleted", edgeId })

            return { edgeId }
        })(this.client.getDocument())
    }
}
