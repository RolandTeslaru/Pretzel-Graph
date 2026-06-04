import { Validation, Foundations, type Workflow } from "@pretzel-graph/shared/domain";
import type { WorkbenchSDK } from "../../sdk";
import { workbenchSelectors } from "../../selectors";
import { fieldVariadicReducers, type FieldVariadicReducers } from "./variadic";
import { fieldConditionReducers, type FieldConditionReducers } from "./condition";
import { fieldCaseListReducers, type FieldCaseListReducers } from "./caseList";

type S       = WorkbenchSDK.State
type NodeId  = Workflow.Node.Id
type FieldId = Foundations.Field.Id

export const fieldReducers = {
    setValue: (s, nodeId, fieldId, value) => {
        s.isDirty = true;
        const cur  = s.data.staticValues[nodeId][fieldId]
        const next = typeof value === "function" ? value(cur as any) : value
        s.data.staticValues[nodeId][fieldId] = next
    },
    clearDependentFields: (s, nodeId, changedFieldId) => {
        const node = s.selectors.node.get(s, nodeId)
        if (!node) return

        for (const sibling of node.fields) {
            if (
                sibling.variant === "ResourceLoader" &&
                sibling.id !== changedFieldId &&
                sibling.dependsOn.includes(changedFieldId)
            ) {
                s.data.staticValues[nodeId][sibling.id] = { mode: "list", value: "" }
                s.isDirty = true
            }
        }
    },
    validate: (s, nodeId, field) => {
        const issue = Validation.Issue.Field.check(field, nodeId, s.data)

        if (issue) {
            s.issues.nodes[nodeId].fields[field.id] = issue;
            return true;
        }

        delete s.issues.nodes[nodeId]?.fields?.[field.id];

        return false;
    },
    markAsReconciling: (s, nodeId, fieldId) => {
        if (!s.reconcilingFields[nodeId])
            s.reconcilingFields[nodeId] = new Set();

        s.reconcilingFields[nodeId].add(fieldId);
    },
    unmarkAsReconciling: (s, nodeId, fieldId) => {
        s.reconcilingFields[nodeId]?.delete(fieldId);
    },
    setIsExpression: (s, nodeId, fieldId, value) => {
        const field = s.selectors.field.get(s, nodeId, fieldId)
        if (!field) return;

        if (field.variant === "String" || field.variant === "UniqueString") {
            field.isExpression = value
            s.isDirty = true;
        } else {
            console.warn(`Tried to set isExpression on non-string field ${fieldId} on node ${nodeId}`)
            return;
        }
    },
    variadic:  fieldVariadicReducers,
    condition: fieldConditionReducers,
    caseList:  fieldCaseListReducers,
} satisfies FieldReducers


export interface FieldReducers {
    setValue: (
        s: S,
        nodeId: NodeId,
        fieldId: FieldId,
        next: Foundations.Field.Value | ((value: Foundations.Field.Value) => Foundations.Field.Value)
    ) => void
    clearDependentFields: (
        s: S,
        nodeId: NodeId,
        changedFieldId: FieldId,
    ) => void
    validate: (
        s: S,
        nodeId: NodeId,
        field: Foundations.Field
    ) => boolean
    markAsReconciling: (
        s: S,
        nodeId: NodeId,
        fieldId: FieldId
    ) => void
    unmarkAsReconciling: (
        s: S,
        nodeId: NodeId,
        fieldId: FieldId
    ) => void
    setIsExpression: (
        s: S,
        nodeId: NodeId,
        fieldId: FieldId,
        value: boolean
    ) => void
    variadic  : FieldVariadicReducers
    condition : FieldConditionReducers
    caseList  : FieldCaseListReducers
}
