import type { Foundations } from "../../Foundations"
import type { Workflow } from "../../Workflow"
import { Document, type DeriveResult } from "../Document"
import type { Summary } from "./summary"
import type { OperationalClient } from "."

const { withCyclesRecompute } = Document

export class FieldOperations {

    constructor(private readonly client: OperationalClient) {}

    public get(nodeId: Workflow.Node.Id, fieldId: Foundations.Field.Id): { value: Foundations.Field.Value | null } {
        const d = this.client.document

        return { value: d.selectors.node.getStaticValue(d, nodeId, fieldId) }
    }

    public set(nodeId: Workflow.Node.Id, fieldId: Foundations.Field.Id, value: unknown): { nodeId: Workflow.Node.Id, fieldId: Foundations.Field.Id, issues: Summary.NodeIssues, derivation: DeriveResult | null } {
        return withCyclesRecompute((d: Document) => {
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
            this.client.report({ type: "field:set", nodeId, fieldId, value })

            return { nodeId, fieldId, issues: d.issues.nodes[nodeId] ?? null, derivation }
        })(this.client.getDocument())
    }
}
