import { conditionSelectors } from "./condition";
import type { ConditionSelectors } from "./condition";
import { caseListSelectors } from "./caseList";
import type { CaseListSelectors } from "./caseList";
import type { WorkbenchSDK } from "../sdk";
import { Field } from '@pretzel-graph/shared/domain/Foundations/Field';
import type { Port } from '@pretzel-graph/shared/domain/Foundations/Port';
import type { Validation, Workflow } from '@pretzel-graph/shared/domain';
import { nodeSelectors } from "./node";

export interface FieldSelectors {
    get            : (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, fieldId: Field.Id) => Field | null
    getValue       : (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, fieldId: Field.Id | Port.Input.Id, fallback?: Field.Value | null) => Field.Value | null
    getIssue       : (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, fieldId: Field.Id) => Validation.Issue.Field | null
    getValues      : (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => Record<Field.Id, any>
    usesExpression : (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, field: Field | Field.Id, defaultValue?: boolean) => boolean
    condition      : ConditionSelectors
    caseList       : CaseListSelectors
}

// Standalone so `usesExpression` can reuse it — referencing it through `fieldSelectors` from
// inside the object's own initializer makes the whole literal circularly inferred.
const getField: FieldSelectors["get"] = (s, nodeId, fieldId) => {
    const node = s.data.nodes[nodeId]
    if (!node) return null;

    return nodeSelectors.getFields(s, nodeId).find(f => f.id === fieldId) ?? null;
}

export const fieldSelectors = {
    get: getField,
    getValue: (s, nodeId, fieldId, fallback = null) => s.data.staticValues[nodeId]?.[fieldId] ?? fallback,
    getIssue: (s, nodeId, fieldId) => s.issues.nodes[nodeId]?.fields[fieldId] ?? null,

    // Whether this field's stored value is airlock source rather than a literal. Takes the field
    // itself when the caller already has it — renderers do, and looking it up would rescan the
    // node's field array on every store change. `defaultValue` covers an unresolvable field id.
    usesExpression: (s, nodeId, field, defaultValue = false) => {
        const resolved = typeof field === "string"
            ? getField(s, nodeId, field)
            : field

        if (!resolved) return defaultValue;

        return Field.usesExpression(resolved, s.data.fieldExpressions[nodeId]?.[resolved.id])
    },

    getValues: (s, nodeId) => {
        const node = s.data.nodes[nodeId]
        if (!node) return {};

        // Bucket-optional: un-seeded nodes have no staticValues entry, so merge each field's
        // initialValue directly from the blueprint.
        const staticValues = s.data.staticValues[nodeId] ?? {}
        const fieldsValues: Record<string, any> = {}
        nodeSelectors.getFields(s, nodeId).forEach(field => {
            fieldsValues[field.id] = staticValues[field.id] ?? field.initialValue;
        })

        return fieldsValues;
    },
    condition: conditionSelectors,
    caseList: caseListSelectors,
} satisfies FieldSelectors
