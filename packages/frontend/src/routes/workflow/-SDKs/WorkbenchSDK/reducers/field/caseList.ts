import { conditionTreeReducers } from "../conditionTree";
import type { WorkbenchSDK } from "../../sdk";
import type { Workflow, Foundations } from "@pretzel-graph/shared/domain";

type S             = WorkbenchSDK.State
type NodeId        = Workflow.Node.Id
type FieldId       = Foundations.Field.Id
type PortId        = Foundations.Port.Output.Id
type CaseListEntry = Foundations.Field.CaseList.Entry
type RuleId        = Foundations.Field.Condition.Rule.Id
type RuleGroupId   = Foundations.Field.Condition.RuleGroup.Id
type Operator      = Foundations.Field.Condition.Operator
type DataType      = Foundations.Field.Condition.DataType

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

export const fieldCaseListReducers = {
    addEntry: (s, nodeId, fieldId, entry) => {
        const caseList = s.selectors.field.caseList.getValue(s, nodeId, fieldId)!
        s.data.staticValues[nodeId][fieldId] = [...caseList, entry]
        s.isDirty = true
    },
    removeEntry: (s, nodeId, fieldId, portId) => {
        const caseList = s.selectors.field.caseList.getValue(s, nodeId, fieldId)!
        s.data.staticValues[nodeId][fieldId] = caseList.filter(entry => entry.portId !== portId)
        s.isDirty = true
    },
    setLabel: (s, nodeId, fieldId, portId, label) => {
        const entry = s.selectors.field.caseList.getEntry(s, nodeId, fieldId, portId)!
        entry.label = label
        replaceCaseListEntry(s, nodeId, fieldId, portId, { ...entry })
        s.isDirty = true
    },
    condition: {
        setLeftValue: (s, nodeId, fieldId, portId, ruleId, value) => {
            const entry = s.selectors.field.caseList.getEntry(s, nodeId, fieldId, portId)!
            conditionTreeReducers.setLeftValue(entry.condition, ruleId, value)
            replaceCaseListEntry(s, nodeId, fieldId, portId, { ...entry })
            s.isDirty = true
        },
        setRightValue: (s, nodeId, fieldId, portId, ruleId, value) => {
            const entry = s.selectors.field.caseList.getEntry(s, nodeId, fieldId, portId)!
            conditionTreeReducers.setRightValue(entry.condition, ruleId, value)
            replaceCaseListEntry(s, nodeId, fieldId, portId, { ...entry })
            s.isDirty = true
        },
        setLeftIsExpression: (s, nodeId, fieldId, portId, ruleId, value) => {
            const entry = s.selectors.field.caseList.getEntry(s, nodeId, fieldId, portId)!
            conditionTreeReducers.setLeftIsExpression(entry.condition, ruleId, value)
            replaceCaseListEntry(s, nodeId, fieldId, portId, { ...entry })
            s.isDirty = true
        },
        setRightIsExpression: (s, nodeId, fieldId, portId, ruleId, value) => {
            const entry = s.selectors.field.caseList.getEntry(s, nodeId, fieldId, portId)!
            conditionTreeReducers.setRightIsExpression(entry.condition, ruleId, value)
            replaceCaseListEntry(s, nodeId, fieldId, portId, { ...entry })
            s.isDirty = true
        },
        setOperator: (s, nodeId, fieldId, portId, ruleId, value, dataType) => {
            const entry = s.selectors.field.caseList.getEntry(s, nodeId, fieldId, portId)!
            conditionTreeReducers.setOperator(entry.condition, ruleId, value, dataType)
            replaceCaseListEntry(s, nodeId, fieldId, portId, { ...entry })
            s.isDirty = true
        },
        addRule: (s, nodeId, fieldId, portId, ruleGroupId) => {
            const entry = s.selectors.field.caseList.getEntry(s, nodeId, fieldId, portId)!
            conditionTreeReducers.addRule(entry.condition, ruleGroupId)
            replaceCaseListEntry(s, nodeId, fieldId, portId, { ...entry })
            s.isDirty = true
        },
        addGroup: (s, nodeId, fieldId, portId, parentGroupId) => {
            const entry = s.selectors.field.caseList.getEntry(s, nodeId, fieldId, portId)!
            conditionTreeReducers.addGroup(entry.condition, parentGroupId)
            replaceCaseListEntry(s, nodeId, fieldId, portId, { ...entry })
            s.isDirty = true
        },
        removeRuleOrGroup: (s, nodeId, fieldId, portId, id, parentGroupId) => {
            const entry = s.selectors.field.caseList.getEntry(s, nodeId, fieldId, portId)!
            conditionTreeReducers.removeRuleOrGroup(entry.condition, id, parentGroupId)
            replaceCaseListEntry(s, nodeId, fieldId, portId, { ...entry })
            s.isDirty = true
        },
        changeCombinator: (s, nodeId, fieldId, portId, ruleGroupId, combinator) => {
            const entry = s.selectors.field.caseList.getEntry(s, nodeId, fieldId, portId)!
            conditionTreeReducers.changeCombinator(entry.condition, ruleGroupId, combinator)
            replaceCaseListEntry(s, nodeId, fieldId, portId, { ...entry })
            s.isDirty = true
        },
    },
} satisfies FieldCaseListReducers


export interface FieldCaseListReducers {
    addEntry    : (s: S, nodeId: NodeId, fieldId: FieldId, entry: CaseListEntry) => void
    removeEntry : (s: S, nodeId: NodeId, fieldId: FieldId, portId: PortId) => void
    setLabel    : (s: S, nodeId: NodeId, fieldId: FieldId, portId: PortId, label: string) => void
    condition: {
        setLeftValue     : (s: S, nodeId: NodeId, fieldId: FieldId, portId: PortId, ruleId: RuleId, value: string) => void
        setRightValue    : (s: S, nodeId: NodeId, fieldId: FieldId, portId: PortId, ruleId: RuleId, value: string) => void
        setLeftIsExpression : (s: S, nodeId: NodeId, fieldId: FieldId, portId: PortId, ruleId: RuleId, value: boolean) => void
        setRightIsExpression: (s: S, nodeId: NodeId, fieldId: FieldId, portId: PortId, ruleId: RuleId, value: boolean) => void
        setOperator      : (s: S, nodeId: NodeId, fieldId: FieldId, portId: PortId, ruleId: RuleId, value: Operator, dataType?: DataType) => void
        addRule          : (s: S, nodeId: NodeId, fieldId: FieldId, portId: PortId, ruleGroupId: RuleGroupId) => void
        addGroup         : (s: S, nodeId: NodeId, fieldId: FieldId, portId: PortId, parentGroupId: RuleGroupId) => void
        removeRuleOrGroup: (s: S, nodeId: NodeId, fieldId: FieldId, portId: PortId, id: RuleId | RuleGroupId, parentGroupId: RuleGroupId) => void
        changeCombinator : (s: S, nodeId: NodeId, fieldId: FieldId, portId: PortId, ruleGroupId: RuleGroupId, combinator: "AND" | "OR") => void
    }
}
