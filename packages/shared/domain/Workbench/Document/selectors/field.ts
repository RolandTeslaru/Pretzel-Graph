import { conditionSelectors } from "./condition";
import type { ConditionSelectors } from "./condition";
import { caseListSelectors } from "./caseList";
import type { CaseListSelectors } from "./caseList";
import type { Document } from "../index";
import { Field } from "../../../Foundations/Field";
import type { Port } from "../../../Foundations/Port";
import type { Validation } from "../../../Validation";
import type { Workflow } from "../../../Workflow";
import { nodeSelectors } from "./node";

export interface FieldSelectors {
    get            : (document: Document, nodeId: Workflow.Node.Id, fieldId: Field.Id) => Field | null
    getValue       : (document: Document, nodeId: Workflow.Node.Id, fieldId: Field.Id | Port.Input.Id, fallback?: Field.Value | null) => Field.Value | null
    getIssue       : (document: Document, nodeId: Workflow.Node.Id, fieldId: Field.Id) => Validation.Issue.Field | null
    getValues      : (document: Document, nodeId: Workflow.Node.Id) => Record<Field.Id, any>
    usesExpression : (document: Document, nodeId: Workflow.Node.Id, field: Field | Field.Id, defaultValue?: boolean) => boolean
    condition      : ConditionSelectors
    caseList       : CaseListSelectors
}

// Standalone so `usesExpression` can reuse it — referencing it through `fieldSelectors` from
// inside the object's own initializer makes the whole literal circularly inferred.
const getField: FieldSelectors["get"] = (d, nodeId, fieldId) => {
    const node = d.data.nodes[nodeId]
    if (!node) return null;

    return nodeSelectors.getFields(d, nodeId).find(f => f.id === fieldId) ?? null;
}

export const fieldSelectors: FieldSelectors = {
    get: getField,
    getValue: (d, nodeId, fieldId, fallback = null) => d.data.staticValues[nodeId]?.[fieldId] ?? fallback,
    getIssue: (d, nodeId, fieldId) => d.issues.nodes[nodeId]?.fields[fieldId] ?? null,

    // Whether this field's stored value is airlock source rather than a literal. Takes the field
    // itself when the caller already has it — renderers do, and looking it up would rescan the
    // node's field array on every store change. `defaultValue` covers an unresolvable field id.
    usesExpression: (d, nodeId, field, defaultValue = false) => {
        const resolved = typeof field === "string"
            ? getField(d, nodeId, field)
            : field

        if (!resolved) return defaultValue;

        return Field.usesExpression(resolved, d.data.fieldExpressions[nodeId]?.[resolved.id])
    },

    getValues: (d, nodeId) => {
        const node = d.data.nodes[nodeId]
        if (!node) return {};

        // Bucket-optional: un-seeded nodes have no staticValues entry, so merge each field's
        // initialValue directly from the blueprint.
        const staticValues = d.data.staticValues[nodeId] ?? {}
        const fieldsValues: Record<string, any> = {}
        nodeSelectors.getFields(d, nodeId).forEach(field => {
            fieldsValues[field.id] = staticValues[field.id] ?? field.initialValue;
        })

        return fieldsValues;
    },
    condition: conditionSelectors,
    caseList: caseListSelectors,
}
