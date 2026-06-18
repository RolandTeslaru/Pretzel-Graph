import { createContext, useContext } from 'react'
import { Foundations, Workflow } from '@pretzel-graph/shared/domain'

type RuleId      = Foundations.Field.Condition.Rule.Id
type RuleGroupId = Foundations.Field.Condition.RuleGroup.Id
type Operator    = Foundations.Field.Condition.Operator
type DataType    = Foundations.Field.Condition.DataType
type Value       = Foundations.Field.Condition.Value

export type ConditionContextActions = {
    setLeftValue     : (ruleId: RuleId, value: string) => void
    setRightValue    : (ruleId: RuleId, value: string) => void
    setLeftIsExpression : (ruleId: RuleId, value: boolean) => void
    setRightIsExpression: (ruleId: RuleId, value: boolean) => void
    setOperator      : (ruleId: RuleId, op: Operator, dt?: DataType) => void
    addRule          : (ruleGroupId: RuleGroupId) => void
    addGroup         : (parentGroupId: RuleGroupId) => void
    removeRuleOrGroup: (id: RuleId | RuleGroupId, parentGroupId: RuleGroupId) => void
    changeCombinator : (ruleGroupId: RuleGroupId, combinator: "AND" | "OR") => void
}

type ConditionContextValue = {
    nodeId : Workflow.Node.Id
    field  : Foundations.Field
    root   : Value
    actions: ConditionContextActions
}

export const ConditionContext = createContext<ConditionContextValue | null>(null)

export const useConditionContext = (): ConditionContextValue => {
    const ctx = useContext(ConditionContext)
    if (!ctx) throw new Error('useConditionContext must be used within ConditionField')
    return ctx
}
