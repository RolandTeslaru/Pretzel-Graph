import { conditionSelectors } from "./condition";
import type { ConditionSelectors } from "./condition";
import { caseListSelectors } from "./caseList";
import type { CaseListSelectors } from "./caseList";
import type { WorkbenchSDK } from "../sdk";
import type { Field } from '@pretzel-graph/shared/domain/Foundations/Field';
import type { Port } from '@pretzel-graph/shared/domain/Foundations/Port';
import type { Validation, Workflow } from '@pretzel-graph/shared/domain';
import { nodeSelectors } from "./node";

export interface FieldSelectors {
    get            : (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, fieldId: Field.Id) => Field | null
    getValue       : (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, fieldId: Field.Id | Port.Input.Id, fallback?: Field.Value | null) => Field.Value | null
    getIssue       : (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, fieldId: Field.Id) => Validation.Issue.Field | null
    getValues      : (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id) => Record<Field.Id, any>
    isReconciling  : (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, fieldId: Field.Id) => boolean
    condition      : ConditionSelectors
    caseList       : CaseListSelectors
}

export const fieldSelectors = {
    get: (s, nodeId, fieldId) => {
        const node = s.data.nodes[nodeId]
        if (!node) return null;

        return nodeSelectors.getFields(s, nodeId).find(f => f.id === fieldId) ?? null;
    },
    getValue: (s, nodeId, fieldId, fallback = null) => s.data.staticValues[nodeId]?.[fieldId] ?? fallback,
    getIssue: (s, nodeId, fieldId) => s.issues.nodes[nodeId]?.fields[fieldId] ?? null,
    isReconciling: (s, nodeId, fieldId) => s.reconcilingFields[nodeId]?.has(fieldId) ?? false,
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
