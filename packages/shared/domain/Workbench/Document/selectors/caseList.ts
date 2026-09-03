import { Field } from '@pretzel-graph/shared/domain/Foundations/Field';
import type { Port } from '@pretzel-graph/shared/domain/Foundations/Port';
import type { WorkbenchSDK } from "../sdk";
import type { Workflow } from '@pretzel-graph/shared/domain';

type NodeId = Workflow.Node.Id
type CaseListValue = Field.CaseList.Value

export interface CaseListSelectors {
    getValue:      (state: WorkbenchSDK.State, nodeId: NodeId, fieldId: Field.Id) => CaseListValue | null
    getEntry:      (state: WorkbenchSDK.State, nodeId: NodeId, fieldId: Field.Id, portId: Port.Output.Id) => Field.CaseList.Entry | null
    getEntryIndex: (state: WorkbenchSDK.State, nodeId: NodeId, fieldId: Field.Id, portId: Port.Output.Id) => number
    getPortIds:    (state: WorkbenchSDK.State, nodeId: NodeId, fieldId: Field.Id) => Port.Output.Id[]
}

export const caseListSelectors = {
    getValue: (s, nodeId, fieldId) =>
        s.data.staticValues[nodeId]?.[fieldId]
            ?? (s.selectors.field.get(s, nodeId, fieldId) as Field.CaseList | null)?.initialValue
            ?? null,
    getEntry: (s, nodeId, fieldId, portId) => {
        const caseList = caseListSelectors.getValue(s, nodeId, fieldId)
        if (!caseList) return null
        return caseList.find((entry: Field.CaseList.Entry) => entry.portId === portId) ?? null
    },
    getEntryIndex: (s, nodeId, fieldId, portId) => {
        const caseList = caseListSelectors.getValue(s, nodeId, fieldId)
        if (!caseList) return -1
        return caseList.findIndex((entry: Field.CaseList.Entry) => entry.portId === portId)
    },
    getPortIds: (s, nodeId, fieldId) => {
        const caseList = caseListSelectors.getValue(s, nodeId, fieldId)
        return caseList?.map((entry: Field.CaseList.Entry) => entry.portId) ?? []
    },
} as CaseListSelectors
