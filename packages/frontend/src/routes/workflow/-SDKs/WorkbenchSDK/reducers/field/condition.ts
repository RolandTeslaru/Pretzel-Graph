import { conditionTreeReducers } from "../conditionTree";
import type { WorkbenchSDK } from "../../sdk";
import type { Workflow, Foundations } from "@pretzel-graph/shared/domain";

type S           = WorkbenchSDK.State
type NodeId      = Workflow.Node.Id
type FieldId     = Foundations.Field.Id
type RuleId      = Foundations.Field.Condition.Rule.Id
type RuleGroupId = Foundations.Field.Condition.RuleGroup.Id
type Operator    = Foundations.Field.Condition.Operator
type DataType    = Foundations.Field.Condition.DataType

export const fieldConditionReducers = {
    setLeftValue: (s, nodeId, fieldId, ruleId, value) => {
        const condition = s.selectors.field.condition.getValue(s, nodeId, fieldId)!
        conditionTreeReducers.setLeftValue(condition, ruleId, value)
        s.isDirty = true
    },
    setRightValue: (s, nodeId, fieldId, ruleId, value) => {
        const condition = s.selectors.field.condition.getValue(s, nodeId, fieldId)!
        conditionTreeReducers.setRightValue(condition, ruleId, value)
        s.isDirty = true
    },
    setLeftIsExpression: (s, nodeId, fieldId, ruleId, value) => {
        const condition = s.selectors.field.condition.getValue(s, nodeId, fieldId)!
        conditionTreeReducers.setLeftIsExpression(condition, ruleId, value)
        s.isDirty = true
    },
    setRightIsExpression: (s, nodeId, fieldId, ruleId, value) => {
        const condition = s.selectors.field.condition.getValue(s, nodeId, fieldId)!
        conditionTreeReducers.setRightIsExpression(condition, ruleId, value)
        s.isDirty = true
    },
    setOperator: (s, nodeId, fieldId, ruleId, value, dataType) => {
        const condition = s.selectors.field.condition.getValue(s, nodeId, fieldId)!
        conditionTreeReducers.setOperator(condition, ruleId, value, dataType)
        s.isDirty = true
    },
    addRule: (s, nodeId, fieldId, ruleGroupId) => {
        const condition = s.selectors.field.condition.getValue(s, nodeId, fieldId)!
        conditionTreeReducers.addRule(condition, ruleGroupId)
        s.isDirty = true
    },
    addGroup: (s, nodeId, fieldId, parentGroupId) => {
        const condition = s.selectors.field.condition.getValue(s, nodeId, fieldId)!
        conditionTreeReducers.addGroup(condition, parentGroupId)
        s.isDirty = true
    },
    removeRuleOrGroup: (s, nodeId, fieldId, id, parentGroupId) => {
        const condition = s.selectors.field.condition.getValue(s, nodeId, fieldId)!
        conditionTreeReducers.removeRuleOrGroup(condition, id, parentGroupId)
        s.isDirty = true
    },
    changeCombinator: (s, nodeId, fieldId, ruleGroupId, combinator) => {
        const condition = s.selectors.field.condition.getValue(s, nodeId, fieldId)!
        conditionTreeReducers.changeCombinator(condition, ruleGroupId, combinator)
        s.isDirty = true
    },
} satisfies FieldConditionReducers


export interface FieldConditionReducers {
    setLeftValue     : (s: S, nodeId: NodeId, fieldId: FieldId, ruleId: RuleId, value: string) => void
    setRightValue    : (s: S, nodeId: NodeId, fieldId: FieldId, ruleId: RuleId, value: string) => void
    setLeftIsExpression : (s: S, nodeId: NodeId, fieldId: FieldId, ruleId: RuleId, value: boolean) => void
    setRightIsExpression: (s: S, nodeId: NodeId, fieldId: FieldId, ruleId: RuleId, value: boolean) => void
    setOperator      : (s: S, nodeId: NodeId, fieldId: FieldId, ruleId: RuleId, value: Operator, dataType?: DataType) => void
    addRule          : (s: S, nodeId: NodeId, fieldId: FieldId, ruleGroupId: RuleGroupId) => void
    addGroup         : (s: S, nodeId: NodeId, fieldId: FieldId, parentGroupId: RuleGroupId) => void
    removeRuleOrGroup: (s: S, nodeId: NodeId, fieldId: FieldId, id: RuleId | RuleGroupId, parentGroupId: RuleGroupId) => void
    changeCombinator : (s: S, nodeId: NodeId, fieldId: FieldId, ruleGroupId: RuleGroupId, combinator: "AND" | "OR") => void
}
