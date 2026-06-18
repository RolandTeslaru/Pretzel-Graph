import { Field } from '@pretzel-graph/shared/domain/Foundations/Field';

type ConditionValue = Field.Condition.Value
type RuleId = Field.Condition.Rule.Id
type RuleGroupId = Field.Condition.RuleGroup.Id
type Operator = Field.Condition.Operator
type DataType = Field.Condition.DataType

interface ConditionTreeReducers {
    setLeftValue(condition: ConditionValue, ruleId: RuleId, value: string): void
    setRightValue(condition: ConditionValue, ruleId: RuleId, value: string): void
    setLeftIsExpression(condition: ConditionValue, ruleId: RuleId, value: boolean): void
    setRightIsExpression(condition: ConditionValue, ruleId: RuleId, value: boolean): void
    setOperator(condition: ConditionValue, ruleId: RuleId, value: Operator, dataType?: DataType): void
    addRule(condition: ConditionValue, ruleGroupId: RuleGroupId): void
    addGroup(condition: ConditionValue, parentGroupId: RuleGroupId): void
    removeRuleOrGroup(condition: ConditionValue, id: RuleId | RuleGroupId, parentGroupId: RuleGroupId): void
    changeCombinator(condition: ConditionValue, ruleGroupId: RuleGroupId, combinator: "AND" | "OR"): void
}

export const conditionTreeReducers: ConditionTreeReducers = {
    setLeftValue: (condition, ruleId, value) => {
        condition.rules[ruleId].leftOperand = value
    },
    setRightValue: (condition, ruleId, value) => {
        condition.rules[ruleId].rightOperand = value
    },
    setLeftIsExpression: (condition, ruleId, value) => {
        condition.rules[ruleId].leftIsExpression = value
    },
    setRightIsExpression: (condition, ruleId, value) => {
        condition.rules[ruleId].rightIsExpression = value
    },
    setOperator: (condition, ruleId, value, dataType) => {
        const rule = condition.rules[ruleId]
        rule.dataType = dataType ?? rule.dataType
        rule.operator = value
    },
    addRule: (condition, ruleGroupId) => {
        const newRuleId = Field.Condition.Rule.createId()
        condition.rules[newRuleId] = {
            id: newRuleId,
            dataType: "string",
            leftOperand: "",
            operator: "equals",
            rightOperand: ""
        } satisfies Field.Condition.Rule
        condition.groups[ruleGroupId].children.push(newRuleId)
    },
    addGroup: (condition, parentGroupId) => {
        const newGroupId = Field.Condition.RuleGroup.createId()
        condition.groups[newGroupId] = {
            id: newGroupId,
            combinator: "AND",
            children: []
        } satisfies Field.Condition.RuleGroup
        condition.groups[parentGroupId].children.push(newGroupId)

        conditionTreeReducers.addRule(condition, newGroupId)
        conditionTreeReducers.addRule(condition, newGroupId)
    },
    removeRuleOrGroup: (condition, id, parentGroupId) => {
        const parentGroup = condition.groups[parentGroupId]

        if (parentGroup.id === "root" && parentGroup.children.length === 1)
            return

        parentGroup.children = parentGroup.children.filter(childId => childId !== id)

        if (id in condition.rules) {
            delete condition.rules[id as RuleId]
        } else if (id in condition.groups) {
            const removeGroupAndChildren = (groupId: RuleGroupId) => {
                const group = condition.groups[groupId]
                group.children.forEach(childId => {
                    if (childId in condition.rules)
                        delete condition.rules[childId as RuleId]
                    else if (childId in condition.groups)
                        removeGroupAndChildren(childId as RuleGroupId)
                })
                delete condition.groups[groupId]
            }
            removeGroupAndChildren(id as RuleGroupId)
        }

        if (parentGroup.children.length === 0) {
            for (const group of Object.values(condition.groups)) {
                const idx = group.children.indexOf(parentGroupId)
                if (idx !== -1) {
                    group.children.splice(idx, 1)
                    break
                }
            }
            delete condition.groups[parentGroupId]
        }

        while (parentGroup.children.length === 1) {
            const onlyChildId = parentGroup.children[0]
            if (!(onlyChildId in condition.groups)) break

            const childGroup = condition.groups[onlyChildId as RuleGroupId]
            parentGroup.children = childGroup.children
            parentGroup.combinator = childGroup.combinator
            delete condition.groups[onlyChildId as RuleGroupId]
        }
    },
    changeCombinator: (condition, ruleGroupId, combinator) => {
        condition.groups[ruleGroupId].combinator = combinator
    },
}
