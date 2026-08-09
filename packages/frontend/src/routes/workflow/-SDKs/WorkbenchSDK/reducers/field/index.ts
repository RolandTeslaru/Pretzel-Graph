import { Validation, Foundations, type Workflow } from "@pretzel-graph/shared/domain";
import type { WorkbenchSDK } from "../../sdk";
import { fieldVariadicReducers, type FieldVariadicReducers } from "./variadic";
import { fieldConditionReducers, type FieldConditionReducers } from "./condition";
import { fieldCaseListReducers, type FieldCaseListReducers } from "./caseList";

type S       = WorkbenchSDK.State
type NodeId  = Workflow.Node.Id
type FieldId = Foundations.Field.Id

// Variants whose Zod schema declares `isExpressionInitially?: boolean` (Foundations/Field.ts) —
// i.e. the ones that have both a static and an expression mode to toggle between. The Expression
// variant is deliberately absent: it has no static mode, so there is nothing to toggle.
const EXPRESSION_CAPABLE_VARIANTS = new Set<Foundations.Field.Variant>([
    "Integer", "Float", "String", "UniqueString", "Secret", "Boolean", "MultiOption", "File", "Json", "List",
])

export const fieldReducers = {
    setValue: (s, nodeId, fieldId, value) => {
        s.isDirty = true;
        const staticValues = s.reducers.node.ensureStaticValues(s, nodeId)
        const cur  = staticValues[fieldId]
        const next = typeof value === "function" ? value(cur as any) : value
        staticValues[fieldId] = next
    },
    clearDependentFields: (s, nodeId, changedFieldId) => {
        const node = s.selectors.node.get(s, nodeId)
        if (!node) return

        const fields = s.selectors.node.getFields(s, nodeId)
        const staticValues = s.reducers.node.ensureStaticValues(s, nodeId)

        for (const sibling of fields) {
            if (
                sibling.variant === "ResourceLoader" &&
                sibling.id !== changedFieldId &&
                sibling.dependsOn.includes(changedFieldId)
            ) {
                staticValues[sibling.id] = { mode: "list", value: "" }
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
    /**
     * Flips a field between static and expression mode.
     *
     * Invariant: in static mode the stored value is a literal, in expression mode it is airlock
     * source. Both re-encodes below depend on it, and the mode guard plus the initialValue fallback
     * are what keep it true — without them a value could be stringified twice and accumulate an
     * escaping layer on every toggle.
     */
    setIsExpression: (s, nodeId, fieldId, value) => {
        const field = s.selectors.field.get(s, nodeId, fieldId)
        if (!field) return;

        if (!EXPRESSION_CAPABLE_VARIANTS.has(field.variant)) {
            console.warn(`Tried to set isExpression on field ${fieldId} on node ${nodeId}, which doesn't support expressions`)
            return;
        }

        if ("only" in field && field.only) {
            console.warn(`Tried to set isExpression on field ${fieldId} on node ${nodeId}, which is locked to "${field.only}"`)
            return;
        }

        const expressionOverrides = (s.data.fieldExpressions[nodeId] ??= {})

        // Re-encoding is only safe on an actual mode change — re-running it in the mode we're
        // already in is what corrupted values before the flag was persisted.
        if (s.selectors.field.usesExpression(s, nodeId, field) === value)
            return;

        const staticValues = s.reducers.node.ensureStaticValues(s, nodeId)
        const current = staticValues[fieldId]

        if (value) {
            // static -> expression: re-encode the literal as valid JS source (a Json field's
            // object, or a MultiOption's bare "GET", aren't expression text on their own)
            if (typeof current !== "undefined") {
                staticValues[fieldId] = field.variant === "Json"
                    ? JSON.stringify(current, null, 2)
                    : JSON.stringify(current)
            }
        } else {
            // expression -> static: recover the literal behind the source. Real code has no
            // literal equivalent, so fall back to the field's default rather than leaving source
            // text parked in a static field — undo restores it if the click was a mistake.
            let recovered: Foundations.Field.Value = 'initialValue' in field ? field.initialValue : undefined

            if (typeof current === "string") {
                try {
                    recovered = JSON.parse(current)
                }
                catch {}
            }

            staticValues[fieldId] = recovered
        }

        expressionOverrides[fieldId] = value
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
