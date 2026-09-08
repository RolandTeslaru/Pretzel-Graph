import { Validation } from "../../../../Validation";
import { Foundations } from "../../../../Foundations";
import type { Workflow } from "../../../../Workflow";
import type { Document } from "../../index";
import { fieldVariadicReducers, type FieldVariadicReducers } from "./variadic";
import { fieldConditionReducers, type FieldConditionReducers } from "./condition";
import { fieldCaseListReducers, type FieldCaseListReducers } from "./caseList";

type NodeId  = Workflow.Node.Id
type FieldId = Foundations.Field.Id

// Variants whose Zod schema declares `isExpressionInitially?: boolean` (Foundations/Field.ts) —
// i.e. the ones that have both a static and an expression mode to toggle between. The Expression
// variant is deliberately absent: it has no static mode, so there is nothing to toggle.
const EXPRESSION_CAPABLE_VARIANTS = new Set<Foundations.Field.Variant>([
    "Integer", "Float", "String", "UniqueString", "Secret", "Boolean", "MultiOption", "File", "Json", "List",
])

export const fieldReducers: FieldReducers = {
    setValue: (d, nodeId, fieldId, value) => {
        d.isDirty = true;
        const staticValues = d.reducers.node.ensureStaticValues(d, nodeId)
        const cur  = staticValues[fieldId]
        const next = typeof value === "function" ? value(cur as any) : value
        staticValues[fieldId] = next
    },
    clearDependentFields: (d, nodeId, changedFieldId) => {
        const node = d.selectors.node.get(d, nodeId)
        if (!node) return

        const fields = d.selectors.node.getFields(d, nodeId)
        const staticValues = d.reducers.node.ensureStaticValues(d, nodeId)

        for (const sibling of fields) {
            if (
                sibling.variant === "ResourceLoader" &&
                sibling.id !== changedFieldId &&
                sibling.dependsOn.includes(changedFieldId)
            ) {
                staticValues[sibling.id] = { mode: "list", value: "" }
                d.isDirty = true
            }
        }
    },
    validate: (d, nodeId, field) => {
        const issue = Validation.Issue.Field.check(field, nodeId, d.data)

        if (issue) {
            d.issues.nodes[nodeId].fields[field.id] = issue;
            return true;
        }

        delete d.issues.nodes[nodeId]?.fields?.[field.id];

        return false;
    },
    /**
     * Flips a field between static and expression mode.
     *
     * Invariant: in static mode the stored value is a literal, in expression mode it is airlock
     * source. Both re-encodes below depend on it, and the mode guard plus the initialValue fallback
     * are what keep it true — without them a value could be stringified twice and accumulate an
     * escaping layer on every toggle.
     */
    setIsExpression: (d, nodeId, fieldId, value) => {
        const field = d.selectors.field.get(d, nodeId, fieldId)
        if (!field) return;

        if (!EXPRESSION_CAPABLE_VARIANTS.has(field.variant)) {
            console.warn(`Tried to set isExpression on field ${fieldId} on node ${nodeId}, which doesn't support expressions`)
            return;
        }

        if ("only" in field && field.only) {
            console.warn(`Tried to set isExpression on field ${fieldId} on node ${nodeId}, which is locked to "${field.only}"`)
            return;
        }

        const expressionOverrides = (d.data.fieldExpressions[nodeId] ??= {})

        // Re-encoding is only safe on an actual mode change — re-running it in the mode we're
        // already in is what corrupted values before the flag was persisted.
        if (d.selectors.field.usesExpression(d, nodeId, field) === value)
            return;

        const staticValues = d.reducers.node.ensureStaticValues(d, nodeId)
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
        d.isDirty = true;
    },
    variadic:  fieldVariadicReducers,
    condition: fieldConditionReducers,
    caseList:  fieldCaseListReducers,
}


export interface FieldReducers {
    setValue: (
        document: Document,
        nodeId: NodeId,
        fieldId: FieldId,
        next: Foundations.Field.Value | ((value: Foundations.Field.Value) => Foundations.Field.Value)
    ) => void
    clearDependentFields: (
        document: Document,
        nodeId: NodeId,
        changedFieldId: FieldId,
    ) => void
    validate: (
        document: Document,
        nodeId: NodeId,
        field: Foundations.Field
    ) => boolean
    setIsExpression: (
        document: Document,
        nodeId: NodeId,
        fieldId: FieldId,
        value: boolean
    ) => void
    variadic  : FieldVariadicReducers
    condition : FieldConditionReducers
    caseList  : FieldCaseListReducers
}
