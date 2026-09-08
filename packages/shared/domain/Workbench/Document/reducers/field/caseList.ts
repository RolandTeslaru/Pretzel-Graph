import type { Document } from "../../index";
import type { Workflow } from "../../../../Workflow";
import type { Foundations } from "../../../../Foundations";

type NodeId        = Workflow.Node.Id
type FieldId       = Foundations.Field.Id
type PortId        = Foundations.Port.Output.Id
type CaseListEntry = Foundations.Field.CaseList.Entry
type EntryValue    = Foundations.Field.CaseList.Entry["value"]

const replaceCaseListEntry = (
    d: Document,
    nodeId: NodeId,
    fieldId: FieldId,
    portId: PortId,
    entry: CaseListEntry
) => {
    const caseList = d.selectors.field.caseList.getValue(d, nodeId, fieldId)!
    const index = caseList.findIndex(item => item.portId === portId)
    if (index === -1)
        throw new Error(`CaseList entry ${portId} not found in field ${fieldId} on node ${nodeId}`)
    caseList[index] = entry
}

export const fieldCaseListReducers: FieldCaseListReducers = {
    addEntry: (d, nodeId, fieldId, entry) => {
        const caseList = d.selectors.field.caseList.getValue(d, nodeId, fieldId)!
        d.reducers.node.ensureStaticValues(d, nodeId)[fieldId] = [...caseList, entry]
        d.isDirty = true
    },
    removeEntry: (d, nodeId, fieldId, portId) => {
        const caseList = d.selectors.field.caseList.getValue(d, nodeId, fieldId)!
        d.reducers.node.ensureStaticValues(d, nodeId)[fieldId] = caseList.filter(entry => entry.portId !== portId)
        d.isDirty = true
    },
    setLabel: (d, nodeId, fieldId, portId, label) => {
        const entry = d.selectors.field.caseList.getEntry(d, nodeId, fieldId, portId)!
        replaceCaseListEntry(d, nodeId, fieldId, portId, { ...entry, label })
        d.isDirty = true
    },
    setValue: (d, nodeId, fieldId, portId, value) => {
        const entry = d.selectors.field.caseList.getEntry(d, nodeId, fieldId, portId)!
        replaceCaseListEntry(d, nodeId, fieldId, portId, { ...entry, value })
        d.isDirty = true
    },
    setIsExpression: (d, nodeId, fieldId, portId, isExpression) => {
        const entry = d.selectors.field.caseList.getEntry(d, nodeId, fieldId, portId)!
        let value: EntryValue = entry.value

        if (isExpression) {
            // entering expression mode: re-encode the boolean as valid JS source ("true"/"false")
            if (typeof value === "boolean")
                value = JSON.stringify(value)
        } else if (typeof value === "string") {
            // leaving expression mode: recover the literal boolean behind the expression text if possible
            try {
                const parsed = JSON.parse(value)
                value = typeof parsed === "boolean" ? parsed : false
            } catch {
                value = false
            }
        }

        replaceCaseListEntry(d, nodeId, fieldId, portId, { ...entry, value, isExpression: isExpression || undefined })
        d.isDirty = true
    },
}


export interface FieldCaseListReducers {
    addEntry      : (document: Document, nodeId: NodeId, fieldId: FieldId, entry: CaseListEntry) => void
    removeEntry   : (document: Document, nodeId: NodeId, fieldId: FieldId, portId: PortId) => void
    setLabel      : (document: Document, nodeId: NodeId, fieldId: FieldId, portId: PortId, label: string) => void
    setValue      : (document: Document, nodeId: NodeId, fieldId: FieldId, portId: PortId, value: EntryValue) => void
    setIsExpression: (document: Document, nodeId: NodeId, fieldId: FieldId, portId: PortId, isExpression: boolean) => void
}
