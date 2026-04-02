import { WorkbenchSDK } from '../../../sdk'
import { Foundations, Workflow } from '@vx-agent-editor/shared/domain'

const { Condition } = Foundations.Field
type RuleId      = Foundations.Field.Condition.Rule.Id
type RuleGroupId = Foundations.Field.Condition.RuleGroup.Id
type Operator    = Foundations.Field.Condition.Operator
type DataType    = Foundations.Field.Condition.DataType
type Value       = Foundations.Field.Condition.Value

export const conditionActions = {
    setLeftValue: (nodeId: Workflow.Node.Id, field: Foundations.Field, ruleId: RuleId, value: string) => {
        WorkbenchSDK.actions.field.setValue(nodeId, field, (prev: Value) => {
            prev.rules[ruleId] = { ...prev.rules[ruleId], leftOperand: value } as Foundations.Field.Condition.Rule
            return prev;
        })
    },
    setOperator: (nodeId: Workflow.Node.Id, field: Foundations.Field, ruleId: RuleId, value: Operator, dataType?: DataType) => {
        WorkbenchSDK.actions.field.setValue(nodeId, field, (prev: Value) => {
            const current = prev.rules[ruleId]
            prev.rules[ruleId] = {
                ...current,
                dataType: dataType ?? current.dataType,
                operator: value,
            } as Foundations.Field.Condition.Rule
            return prev;
        })
    },
    setRightValue: (nodeId: Workflow.Node.Id, field: Foundations.Field, ruleId: RuleId, value: string) => {
        WorkbenchSDK.actions.field.setValue(nodeId, field, (prev: Value) => {
            prev.rules[ruleId] = { ...prev.rules[ruleId], rightOperand: value } as Foundations.Field.Condition.Rule
            return prev;
        })
    },
    addRule: (nodeId: Workflow.Node.Id, field: Foundations.Field, ruleGroupId: RuleGroupId) => {
        const newRuleId = Condition.Rule.createId();
        WorkbenchSDK.actions.field.setValue(nodeId, field, (prev: Value) => {
            prev.rules[newRuleId] = { id: newRuleId, dataType: "string", leftOperand: "", operator: "equals", rightOperand: "" }
            prev.groups[ruleGroupId].children.push(newRuleId)
            return prev;
        })
    },
    addGroup: (nodeId: Workflow.Node.Id, field: Foundations.Field, parentGroupId: RuleGroupId) => {
        const newGroupId = Condition.RuleGroup.createId();

        WorkbenchSDK.actions.field.setValue(nodeId, field, (prev: Value) => {
            prev.groups[newGroupId] = { id: newGroupId, combinator: "AND", children: [] }
            prev.groups[parentGroupId].children.push(newGroupId)

            let newRuleId = Condition.Rule.createId();
            prev.rules[newRuleId] = { id: newRuleId, dataType: "string", leftOperand: "", operator: "equals", rightOperand: "" }
            prev.groups[newGroupId].children.push(newRuleId)
            newRuleId = Condition.Rule.createId();
            prev.rules[newRuleId] = { id: newRuleId, dataType: "string", leftOperand: "", operator: "equals", rightOperand: "" }
            prev.groups[newGroupId].children.push(newRuleId)
            return prev;
        })
    },
    removeRuleOrGroup: (nodeId: Workflow.Node.Id, field: Foundations.Field, id: RuleId | RuleGroupId, parentGroupId: RuleGroupId) => {
        WorkbenchSDK.actions.field.setValue(nodeId, field, (prev: Value) => {
            const parentGroup = prev.groups[parentGroupId];

            if (parentGroup.id === "root" && parentGroup.children.length === 1) {
                return prev;
            }

            parentGroup.children = parentGroup.children.filter(childId => childId !== id);

            if (id in prev.rules) {
                delete prev.rules[id as RuleId];
            } else if (id in prev.groups) {
                const removeGroupAndChildren = (groupId: RuleGroupId) => {
                    const group = prev.groups[groupId];
                    group.children.forEach(childId => {
                        if (childId in prev.rules) {
                            delete prev.rules[childId as RuleId];
                        } else if (childId in prev.groups) {
                            removeGroupAndChildren(childId as RuleGroupId);
                        }
                    });
                    delete prev.groups[groupId];
                }
                removeGroupAndChildren(id as RuleGroupId);
            }

            if (parentGroup.children.length === 0) {
                // Remove stale reference from grandparent's children
                for (const group of Object.values(prev.groups)) {
                    const idx = group.children.indexOf(parentGroupId);
                    if (idx !== -1) {
                        group.children.splice(idx, 1);
                        break;
                    }
                }
                delete prev.groups[parentGroupId]
            }

            // Collapse single-child group nesting: if a group's only child is another group, absorb it
            while (parentGroup.children.length === 1) {
                const onlyChildId = parentGroup.children[0];
                if (!(onlyChildId in prev.groups)) break;
                const childGroup = prev.groups[onlyChildId as RuleGroupId];
                parentGroup.children = childGroup.children;
                parentGroup.combinator = childGroup.combinator;
                delete prev.groups[onlyChildId as RuleGroupId];
            }

            return prev;
        })
    },
    changeCombinator: (nodeId: Workflow.Node.Id, field: Foundations.Field, ruleGroupId: RuleGroupId, combinator: "AND" | "OR") => {
        WorkbenchSDK.actions.field.setValue(nodeId, field, (prev: Value) => {
            prev.groups[ruleGroupId].combinator = combinator;
            return prev;
        })
    }
}
