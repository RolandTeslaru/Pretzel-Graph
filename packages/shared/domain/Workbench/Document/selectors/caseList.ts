import { Field } from "../../../Foundations/Field";
import type { Port } from "../../../Foundations/Port";
import type { Document } from "../index";
import type { Workflow } from "../../../Workflow";

type NodeId = Workflow.Node.Id
type CaseListValue = Field.CaseList.Value

export interface CaseListSelectors {
    getValue:      (document: Document, nodeId: NodeId, fieldId: Field.Id) => CaseListValue | null
    getEntry:      (document: Document, nodeId: NodeId, fieldId: Field.Id, portId: Port.Output.Id) => Field.CaseList.Entry | null
    getEntryIndex: (document: Document, nodeId: NodeId, fieldId: Field.Id, portId: Port.Output.Id) => number
    getPortIds:    (document: Document, nodeId: NodeId, fieldId: Field.Id) => Port.Output.Id[]
}

export const caseListSelectors = {
    getValue: (d, nodeId, fieldId) =>
        d.data.staticValues[nodeId]?.[fieldId]
            ?? (d.selectors.field.get(d, nodeId, fieldId) as Field.CaseList | null)?.initialValue
            ?? null,
    getEntry: (d, nodeId, fieldId, portId) => {
        const caseList = caseListSelectors.getValue(d, nodeId, fieldId)
        if (!caseList) return null
        return caseList.find((entry: Field.CaseList.Entry) => entry.portId === portId) ?? null
    },
    getEntryIndex: (d, nodeId, fieldId, portId) => {
        const caseList = caseListSelectors.getValue(d, nodeId, fieldId)
        if (!caseList) return -1
        return caseList.findIndex((entry: Field.CaseList.Entry) => entry.portId === portId)
    },
    getPortIds: (d, nodeId, fieldId) => {
        const caseList = caseListSelectors.getValue(d, nodeId, fieldId)
        return caseList?.map((entry: Field.CaseList.Entry) => entry.portId) ?? []
    },
} as CaseListSelectors
