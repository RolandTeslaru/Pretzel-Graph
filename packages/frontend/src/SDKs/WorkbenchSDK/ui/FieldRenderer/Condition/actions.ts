import { WorkbenchSDK } from '../../../sdk'
import { Foundations, Workflow } from '@vx-agent-editor/shared/domain'

export const conditionActions = {
    setLeftValue: (nodeId: Workflow.Node.Id, field: Foundations.Field, ruleId: Foundations.Field.Condition.Rule.Id, value: string) => {
        WorkbenchSDK.actions.field.setValue(nodeId, field, (prev: Foundations.Field.Condition.Value) => {
            prev.rules[ruleId].leftOperand = value
            return prev;
        })
    },
    setOperator: (nodeId: Workflow.Node.Id, field: Foundations.Field, ruleId: Foundations.Field.Condition.Rule.Id, value: Foundations.Field.Condition.Operator) => {
        WorkbenchSDK.actions.field.setValue(nodeId, field, (prev: Foundations.Field.Condition.Value) => {
            prev.rules[ruleId].operator = value
            return prev;
        })
    },
    setRightValue: (nodeId: Workflow.Node.Id, field: Foundations.Field, ruleId: Foundations.Field.Condition.Rule.Id, value: string) => {
        WorkbenchSDK.actions.field.setValue(nodeId, field, (prev: Foundations.Field.Condition.Value) => {
            prev.rules[ruleId].rightOperand = value
            return prev;
        })
    },
    addRule: (nodeId: Workflow.Node.Id, field: Foundations.Field, ruleGroupId: Foundations.Field.Condition.RuleGroup.Id) => {
        const newRuleId = Foundations.Field.Condition.Rule.createId();
        WorkbenchSDK.actions.field.setValue(nodeId, field, (prev: Foundations.Field.Condition.Value) => {
            prev.rules[newRuleId] = { id: newRuleId, leftOperand: "", operator: "equals", rightOperand: "" }
            prev.groups[ruleGroupId].children.push(newRuleId)
            return prev;
        })
    },
    addGroup: (nodeId: Workflow.Node.Id, field: Foundations.Field, parentGroupId: Foundations.Field.Condition.RuleGroup.Id) => {
        const newGroupId = Foundations.Field.Condition.RuleGroup.createId();
        WorkbenchSDK.actions.field.setValue(nodeId, field, (prev: Foundations.Field.Condition.Value) => {
            prev.groups[newGroupId] = { id: newGroupId, combinator: "AND", children: [] }
            prev.groups[parentGroupId].children.push(newGroupId)

            let newRuleId = Foundations.Field.Condition.Rule.createId();
            prev.rules[newRuleId] = { id: newRuleId, leftOperand: "", operator: "equals", rightOperand: "" }
            prev.groups[newGroupId].children.push(newRuleId)
            newRuleId = Foundations.Field.Condition.Rule.createId();
            prev.rules[newRuleId] = { id: newRuleId, leftOperand: "", operator: "equals", rightOperand: "" }
            prev.groups[newGroupId].children.push(newRuleId)
            return prev;
        })
    },
    removeRuleOrGroup: (nodeId: Workflow.Node.Id, field: Foundations.Field, id: Foundations.Field.Condition.Rule.Id | Foundations.Field.Condition.RuleGroup.Id, parentGroupId: Foundations.Field.Condition.RuleGroup.Id) => {
        WorkbenchSDK.actions.field.setValue(nodeId, field, (prev: Foundations.Field.Condition.Value) => {
            const parentGroup = prev.groups[parentGroupId];

            if (parentGroup.id === "root" && parentGroup.children.length === 1) {
                return prev;
            }

            parentGroup.children = parentGroup.children.filter(childId => childId !== id);

            if (id in prev.rules) {
                delete prev.rules[id as Foundations.Field.Condition.Rule.Id];
            } else if (id in prev.groups) {
                const removeGroupAndChildren = (groupId: Foundations.Field.Condition.RuleGroup.Id) => {
                    const group = prev.groups[groupId];
                    group.children.forEach(childId => {
                        if (childId in prev.rules) {
                            delete prev.rules[childId as Foundations.Field.Condition.Rule.Id];
                        } else if (childId in prev.groups) {
                            removeGroupAndChildren(childId as Foundations.Field.Condition.RuleGroup.Id);
                        }
                    });
                    delete prev.groups[groupId];
                }
                removeGroupAndChildren(id as Foundations.Field.Condition.RuleGroup.Id);
            }

            if (parentGroup.children.length === 0) {
                delete prev.groups[parentGroupId]
            }

            return prev;
        })
    },
    changeCombinator: (nodeId: Workflow.Node.Id, field: Foundations.Field, ruleGroupId: Foundations.Field.Condition.RuleGroup.Id, combinator: "AND" | "OR") => {
        WorkbenchSDK.actions.field.setValue(nodeId, field, (prev: Foundations.Field.Condition.Value) => {
            prev.groups[ruleGroupId].combinator = combinator;
            return prev;
        })
    }
}
