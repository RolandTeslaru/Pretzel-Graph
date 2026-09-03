import type { Document } from "../../index";
import type { Workflow } from "../../../../Workflow";
import type { Foundations } from "../../../../Foundations";

type S             = Document
type NodeId        = Workflow.Node.Id
type FieldId       = Foundations.Field.Id
type PortId        = Foundations.Port.Output.Id
type CaseListEntry = Foundations.Field.CaseList.Entry
type EntryValue    = Foundations.Field.CaseList.Entry["value"]

const replaceCaseListEntry = (
    s: S,
    nodeId: NodeId,
    fieldId: FieldId,
    portId: PortId,
    entry: CaseListEntry
) => {
    const caseList = s.selectors.field.caseList.getValue(s, nodeId, fieldId)!
    const index = caseList.findIndex(item => item.portId === portId)
    if (index === -1)
        throw new Error(`CaseList entry ${portId} not found in field ${fieldId} on node ${nodeId}`)
    caseList[index] = entry
}

export const fieldCaseListReducers: FieldCaseListReducers = {
    addEntry: (s, nodeId, fieldId, entry) => {
        const caseList = s.selectors.field.caseList.getValue(s, nodeId, fieldId)!
        s.reducers.node.ensureStaticValues(s, nodeId)[fieldId] = [...caseList, entry]
        s.isDirty = true
    },
    removeEntry: (s, nodeId, fieldId, portId) => {
        const caseList = s.selectors.field.caseList.getValue(s, nodeId, fieldId)!
        s.reducers.node.ensureStaticValues(s, nodeId)[fieldId] = caseList.filter(entry => entry.portId !== portId)
        s.isDirty = true
    },
    setLabel: (s, nodeId, fieldId, portId, label) => {
        const entry = s.selectors.field.caseList.getEntry(s, nodeId, fieldId, portId)!
        replaceCaseListEntry(s, nodeId, fieldId, portId, { ...entry, label })
        s.isDirty = true
    },
    setValue: (s, nodeId, fieldId, portId, value) => {
        const entry = s.selectors.field.caseList.getEntry(s, nodeId, fieldId, portId)!
        replaceCaseListEntry(s, nodeId, fieldId, portId, { ...entry, value })
        s.isDirty = true
    },
    setIsExpression: (s, nodeId, fieldId, portId, isExpression) => {
        const entry = s.selectors.field.caseList.getEntry(s, nodeId, fieldId, portId)!
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

        replaceCaseListEntry(s, nodeId, fieldId, portId, { ...entry, value, isExpression: isExpression || undefined })
        s.isDirty = true
    },
}


export interface FieldCaseListReducers {
    addEntry      : (s: S, nodeId: NodeId, fieldId: FieldId, entry: CaseListEntry) => void
    removeEntry   : (s: S, nodeId: NodeId, fieldId: FieldId, portId: PortId) => void
    setLabel      : (s: S, nodeId: NodeId, fieldId: FieldId, portId: PortId, label: string) => void
    setValue      : (s: S, nodeId: NodeId, fieldId: FieldId, portId: PortId, value: EntryValue) => void
    setIsExpression: (s: S, nodeId: NodeId, fieldId: FieldId, portId: PortId, isExpression: boolean) => void
}
