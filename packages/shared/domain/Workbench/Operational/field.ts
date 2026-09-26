import { Foundations } from "../../Foundations"
import type { Workflow } from "../../Workflow"
import { Document, type DeriveResult } from "../Document"
import type { Summary } from "./summary"
import type { FieldMode } from "./types"
import type { OperationalClient } from "."

const { withCyclesRecompute } = Document

export class FieldOperations {

    constructor(private readonly client: OperationalClient) {}

    public get(nodeId: Workflow.Node.Id, fieldId: Foundations.Field.Id): { value: Foundations.Field.Value | null, mode: FieldMode | null } {
        const d     = this.client.document
        const field = d.selectors.field.get(d, nodeId, fieldId)

        return { value: d.selectors.node.getStaticValue(d, nodeId, fieldId), mode: field ? this.getMode(d, nodeId, field) : null }
    }

    /** With a mode, the field switches to it first, so the value is read in that mode. */
    public set(nodeId: Workflow.Node.Id, fieldId: Foundations.Field.Id, value: unknown, mode?: FieldMode): { nodeId: Workflow.Node.Id, fieldId: Foundations.Field.Id, mode: FieldMode, issues: Summary.NodeIssues, derivation: DeriveResult | null } {
        if (mode)
            this.setMode(nodeId, fieldId, mode)

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

            return { nodeId, fieldId, mode: this.getMode(d, nodeId, field), issues: d.issues.nodes[nodeId] ?? null, derivation }
        })(this.client.getDocument())
    }

    /** Switches a field between static and expression mode, re-encoding its stored value. */
    public setMode(nodeId: Workflow.Node.Id, fieldId: Foundations.Field.Id, mode: FieldMode): { nodeId: Workflow.Node.Id, fieldId: Foundations.Field.Id, mode: FieldMode, value: Foundations.Field.Value | null, issues: Summary.NodeIssues } {
        const d     = this.client.getDocument()
        const field = d.selectors.field.get(d, nodeId, fieldId)

        if (!field)
            throw new Error(`Field ${fieldId} not found on node ${nodeId}`)

        const current = this.getMode(d, nodeId, field)

        if (current !== mode && !Foundations.Field.canSwitchMode(field))
            throw new Error(`Field ${fieldId} is always ${current}; its mode cannot be changed`)

        if (current !== mode) {
            d.reducers.field.setIsExpression(d, nodeId, fieldId, mode === "expression")
            d.reducers.node.validate(d, nodeId)
            this.client.report({ type: "field:modeSet", nodeId, fieldId, mode })
        }

        return { nodeId, fieldId, mode, value: d.selectors.node.getStaticValue(d, nodeId, fieldId), issues: d.issues.nodes[nodeId] ?? null }
    }

    public getMode(d: Document, nodeId: Workflow.Node.Id, field: Foundations.Field): FieldMode {
        return d.selectors.field.usesExpression(d, nodeId, field) ? "expression" : "static"
    }
}
