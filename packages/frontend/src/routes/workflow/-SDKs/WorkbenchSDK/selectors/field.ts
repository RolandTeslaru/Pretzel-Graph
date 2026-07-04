import { conditionSelectors } from "./condition";
import type { ConditionSelectors } from "./condition";
import { caseListSelectors } from "./caseList";
import type { CaseListSelectors } from "./caseList";
import type { WorkbenchSDK } from "../sdk";
import type { Field } from '@pretzel-graph/shared/domain/Foundations/Field';
import type { Workflow } from '@pretzel-graph/shared/domain';
import { nodeSelectors } from "./node";

export interface FieldSelectors {
    get            : (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, fieldId: Field.Id) => Field | null
    getValue       : (state: WorkbenchSDK.State, nodeId: Workflow.Node.Id, fieldId: Field.Id) => Field.Value | null
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
    getValue: (s, nodeId, fieldId) => s.data.staticValues[nodeId]?.[fieldId] ?? null,
    isReconciling: (s, nodeId, fieldId) => s.reconcilingFields[nodeId]?.has(fieldId) ?? false,
    getValues: (s, nodeId) => {
        const staticValues = s.data.staticValues[nodeId]
        if (!staticValues)
            return {};

        const node = s.data.nodes[nodeId]
        if (!node) return {};

        const fieldsValues: Record<string, any> = {}
        nodeSelectors.getFields(s, nodeId).forEach(field => {
            fieldsValues[field.id] = staticValues[field.id] ?? field.initialValue;
        })

        return fieldsValues;
    },
    condition: conditionSelectors,
    caseList: caseListSelectors,
} satisfies FieldSelectors
