import { conditionTreeReducers } from "../conditionTree";
import type { Document } from "../../index";
import type { Workflow } from "../../../../Workflow";
import type { Foundations } from "../../../../Foundations";

type NodeId      = Workflow.Node.Id
type FieldId     = Foundations.Field.Id
type RuleId      = Foundations.Field.Condition.Rule.Id
type RuleGroupId = Foundations.Field.Condition.RuleGroup.Id
type Operator    = Foundations.Field.Condition.Operator
type DataType    = Foundations.Field.Condition.DataType

export const fieldConditionReducers: FieldConditionReducers = {
    setLeftValue: (d, nodeId, fieldId, ruleId, value) => {
        const condition = d.selectors.field.condition.getValue(d, nodeId, fieldId)!
        conditionTreeReducers.setLeftValue(condition, ruleId, value)
        d.isDirty = true
    },
    setRightValue: (d, nodeId, fieldId, ruleId, value) => {
        const condition = d.selectors.field.condition.getValue(d, nodeId, fieldId)!
        conditionTreeReducers.setRightValue(condition, ruleId, value)
        d.isDirty = true
    },
    setLeftIsExpression: (d, nodeId, fieldId, ruleId, value) => {
        const condition = d.selectors.field.condition.getValue(d, nodeId, fieldId)!
        conditionTreeReducers.setLeftIsExpression(condition, ruleId, value)
        d.isDirty = true
    },
    setRightIsExpression: (d, nodeId, fieldId, ruleId, value) => {
        const condition = d.selectors.field.condition.getValue(d, nodeId, fieldId)!
        conditionTreeReducers.setRightIsExpression(condition, ruleId, value)
        d.isDirty = true
    },
    setOperator: (d, nodeId, fieldId, ruleId, value, dataType) => {
        const condition = d.selectors.field.condition.getValue(d, nodeId, fieldId)!
        conditionTreeReducers.setOperator(condition, ruleId, value, dataType)
        d.isDirty = true
    },
    addRule: (d, nodeId, fieldId, ruleGroupId) => {
        const condition = d.selectors.field.condition.getValue(d, nodeId, fieldId)!
        conditionTreeReducers.addRule(condition, ruleGroupId)
        d.isDirty = true
    },
    addGroup: (d, nodeId, fieldId, parentGroupId) => {
        const condition = d.selectors.field.condition.getValue(d, nodeId, fieldId)!
        conditionTreeReducers.addGroup(condition, parentGroupId)
        d.isDirty = true
    },
    removeRuleOrGroup: (d, nodeId, fieldId, id, parentGroupId) => {
        const condition = d.selectors.field.condition.getValue(d, nodeId, fieldId)!
        conditionTreeReducers.removeRuleOrGroup(condition, id, parentGroupId)
        d.isDirty = true
    },
    changeCombinator: (d, nodeId, fieldId, ruleGroupId, combinator) => {
        const condition = d.selectors.field.condition.getValue(d, nodeId, fieldId)!
        conditionTreeReducers.changeCombinator(condition, ruleGroupId, combinator)
        d.isDirty = true
    },
}


export interface FieldConditionReducers {
    setLeftValue     : (document: Document, nodeId: NodeId, fieldId: FieldId, ruleId: RuleId, value: string) => void
    setRightValue    : (document: Document, nodeId: NodeId, fieldId: FieldId, ruleId: RuleId, value: string) => void
    setLeftIsExpression : (document: Document, nodeId: NodeId, fieldId: FieldId, ruleId: RuleId, value: boolean) => void
    setRightIsExpression: (document: Document, nodeId: NodeId, fieldId: FieldId, ruleId: RuleId, value: boolean) => void
    setOperator      : (document: Document, nodeId: NodeId, fieldId: FieldId, ruleId: RuleId, value: Operator, dataType?: DataType) => void
    addRule          : (document: Document, nodeId: NodeId, fieldId: FieldId, ruleGroupId: RuleGroupId) => void
    addGroup         : (document: Document, nodeId: NodeId, fieldId: FieldId, parentGroupId: RuleGroupId) => void
    removeRuleOrGroup: (document: Document, nodeId: NodeId, fieldId: FieldId, id: RuleId | RuleGroupId, parentGroupId: RuleGroupId) => void
    changeCombinator : (document: Document, nodeId: NodeId, fieldId: FieldId, ruleGroupId: RuleGroupId, combinator: "AND" | "OR") => void
}
