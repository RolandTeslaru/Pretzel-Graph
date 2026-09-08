import { WorkbenchSDK } from '../../../sdk'
import { Foundations, Workflow } from '@pretzel-graph/shared/domain'
import { conditionTreeReducers } from '@pretzel-graph/shared/domain/Workbench/Document'

type RuleId      = Foundations.Field.Condition.Rule.Id
type RuleGroupId = Foundations.Field.Condition.RuleGroup.Id
type Operator    = Foundations.Field.Condition.Operator
type DataType    = Foundations.Field.Condition.DataType

export const conditionReducers = conditionTreeReducers

export const bindConditionActions = (nodeId: Workflow.Node.Id, field: Foundations.Field) => ({
    setLeftValue     : (ruleId: RuleId, value: string)                          => WorkbenchSDK.actions.field.condition.setLeftValue(nodeId, field.id, ruleId, value),
    setRightValue    : (ruleId: RuleId, value: string)                          => WorkbenchSDK.actions.field.condition.setRightValue(nodeId, field.id, ruleId, value),
    setLeftIsExpression : (ruleId: RuleId, value: boolean)                      => WorkbenchSDK.actions.field.condition.setLeftIsExpression(nodeId, field.id, ruleId, value),
    setRightIsExpression: (ruleId: RuleId, value: boolean)                      => WorkbenchSDK.actions.field.condition.setRightIsExpression(nodeId, field.id, ruleId, value),
    setOperator      : (ruleId: RuleId, op: Operator, dt?: DataType)            => WorkbenchSDK.actions.field.condition.setOperator(nodeId, field.id, ruleId, op, dt),
    addRule          : (ruleGroupId: RuleGroupId)                               => WorkbenchSDK.actions.field.condition.addRule(nodeId, field.id, ruleGroupId),
    addGroup         : (parentGroupId: RuleGroupId)                             => WorkbenchSDK.actions.field.condition.addGroup(nodeId, field.id, parentGroupId),
    removeRuleOrGroup: (id: RuleId | RuleGroupId, parentGroupId: RuleGroupId)   => WorkbenchSDK.actions.field.condition.removeRuleOrGroup(nodeId, field.id, id, parentGroupId),
    changeCombinator : (ruleGroupId: RuleGroupId, combinator: "AND" | "OR")     => WorkbenchSDK.actions.field.condition.changeCombinator(nodeId, field.id, ruleGroupId, combinator),
})
