import { Validation, Foundations, type Workflow } from "@pretzel-graph/shared/domain";
import type { WorkbenchSDK } from "../../sdk";
import { workbenchSelectors } from "../../selectors";
import { fieldVariadicReducers, type FieldVariadicReducers } from "./variadic";
import { fieldConditionReducers, type FieldConditionReducers } from "./condition";
import { fieldCaseListReducers, type FieldCaseListReducers } from "./caseList";
import { nodeSelectors } from "../../selectors/node";

type S       = WorkbenchSDK.State
type NodeId  = Workflow.Node.Id
type FieldId = Foundations.Field.Id

// Variants whose Zod schema declares `isExpression?: boolean` (Foundations/Field.ts).
// Can't detect support via `'isExpression' in field` — the key is absent until the
// first toggle, since the property is optional and starts unset.
const EXPRESSION_CAPABLE_VARIANTS = new Set<Foundations.Field.Variant>([
    "Integer", "Float", "String", "UniqueString", "Secret", "Boolean", "MultiOption", "File", "Json", "List",
])

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

        const fields = nodeSelectors.getFields(s, nodeId)

        for (const sibling of fields) {
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

        if (!EXPRESSION_CAPABLE_VARIANTS.has(field.variant)) {
            console.warn(`Tried to set isExpression on field ${fieldId} on node ${nodeId}, which doesn't support expressions`)
            return;
        }

        const current = s.data.staticValues[nodeId]?.[fieldId]

        if (value) {
            // entering expression mode: re-encode the raw value as valid JS source
            // (e.g. a Json field's object, or a MultiOption's bare string "GET",
            // aren't valid expression text on their own)
            if (typeof current !== "undefined") {
                s.data.staticValues[nodeId][fieldId] = field.variant === "Json"
                    ? JSON.stringify(current, null, 2)
                    : JSON.stringify(current)
            }
        } else if (typeof current === "string") {
            // leaving expression mode: recover the literal value behind the expression
            // text if it's just a JSON literal; otherwise leave the raw text as-is
            try {
                s.data.staticValues[nodeId][fieldId] = JSON.parse(current)
            } catch {}
        }

        (field as { isExpression?: boolean }).isExpression = value
        s.isDirty = true;
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
