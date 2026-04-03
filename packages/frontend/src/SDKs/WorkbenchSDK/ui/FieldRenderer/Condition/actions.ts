import { WorkbenchSDK } from '../../../sdk'
import { Foundations, Workflow } from '@vx-agent-editor/shared/domain'

const setValue = WorkbenchSDK.actions.field.setValue

const { Condition } = Foundations.Field
type RuleId      = Foundations.Field.Condition.Rule.Id
type RuleGroupId = Foundations.Field.Condition.RuleGroup.Id
type Operator    = Foundations.Field.Condition.Operator
type DataType    = Foundations.Field.Condition.DataType
type Value       = Foundations.Field.Condition.Value

export const conditionReducers = {
    setLeftValue: (draft: Value, ruleId: RuleId, value: string) => {
        draft.rules[ruleId] = { ...draft.rules[ruleId], leftOperand: value } as Foundations.Field.Condition.Rule
    },
    setOperator: (draft: Value, ruleId: RuleId, value: Operator, dataType?: DataType) => {
        const current = draft.rules[ruleId]
        draft.rules[ruleId] = {
            ...current,
            dataType: dataType ?? current.dataType,
            operator: value,
        } as Foundations.Field.Condition.Rule
    },
    setRightValue: (draft: Value, ruleId: RuleId, value: string) => {
        draft.rules[ruleId] = { ...draft.rules[ruleId], rightOperand: value } as Foundations.Field.Condition.Rule
    },
    addRule: (draft: Value, ruleGroupId: RuleGroupId) => {
        const newRuleId = Condition.Rule.createId();
        draft.rules[newRuleId] = { id: newRuleId, dataType: "string", leftOperand: "", operator: "equals", rightOperand: "" }
        draft.groups[ruleGroupId].children.push(newRuleId)
    },
    addGroup: (draft: Value, parentGroupId: RuleGroupId) => {
        const newGroupId = Condition.RuleGroup.createId();
        draft.groups[newGroupId] = { id: newGroupId, combinator: "AND", children: [] }
        draft.groups[parentGroupId].children.push(newGroupId)

        let newRuleId = Condition.Rule.createId();
        draft.rules[newRuleId] = { id: newRuleId, dataType: "string", leftOperand: "", operator: "equals", rightOperand: "" }
        draft.groups[newGroupId].children.push(newRuleId)
        newRuleId = Condition.Rule.createId();
        draft.rules[newRuleId] = { id: newRuleId, dataType: "string", leftOperand: "", operator: "equals", rightOperand: "" }
        draft.groups[newGroupId].children.push(newRuleId)
    },
    removeRuleOrGroup: (draft: Value, id: RuleId | RuleGroupId, parentGroupId: RuleGroupId) => {
        const parentGroup = draft.groups[parentGroupId];

        if (parentGroup.id === "root" && parentGroup.children.length === 1)
            return;

        parentGroup.children = parentGroup.children.filter(childId => childId !== id);

        if (id in draft.rules) {
            delete draft.rules[id as RuleId];
        } else if (id in draft.groups) {
            const removeGroupAndChildren = (groupId: RuleGroupId) => {
                const group = draft.groups[groupId];
                group.children.forEach(childId => {
                    if (childId in draft.rules)
                        delete draft.rules[childId as RuleId];
                    else if (childId in draft.groups)
                        removeGroupAndChildren(childId as RuleGroupId);
                });
                delete draft.groups[groupId];
            }
            removeGroupAndChildren(id as RuleGroupId);
        }

        if (parentGroup.children.length === 0) {
            for (const group of Object.values(draft.groups)) {
                const idx = group.children.indexOf(parentGroupId);
                if (idx !== -1) {
                    group.children.splice(idx, 1);
                    break;
                }
            }
            delete draft.groups[parentGroupId]
        }

        while (parentGroup.children.length === 1) {
            const onlyChildId = parentGroup.children[0];
            if (!(onlyChildId in draft.groups)) break;
            const childGroup = draft.groups[onlyChildId as RuleGroupId];
            parentGroup.children = childGroup.children;
            parentGroup.combinator = childGroup.combinator;
            delete draft.groups[onlyChildId as RuleGroupId];
        }
    },
    changeCombinator: (draft: Value, ruleGroupId: RuleGroupId, combinator: "AND" | "OR") => {
        draft.groups[ruleGroupId].combinator = combinator;
    },
}

export const bindConditionActions = (nodeId: Workflow.Node.Id, field: Foundations.Field) => ({
    setLeftValue     : (ruleId: RuleId, value: string)                          => conditionActions.setLeftValue(nodeId, field, ruleId, value),
    setRightValue    : (ruleId: RuleId, value: string)                          => conditionActions.setRightValue(nodeId, field, ruleId, value),
    setOperator      : (ruleId: RuleId, op: Operator, dt?: DataType)            => conditionActions.setOperator(nodeId, field, ruleId, op, dt),
    addRule          : (ruleGroupId: RuleGroupId)                               => conditionActions.addRule(nodeId, field, ruleGroupId),
    addGroup         : (parentGroupId: RuleGroupId)                             => conditionActions.addGroup(nodeId, field, parentGroupId),
    removeRuleOrGroup: (id: RuleId | RuleGroupId, parentGroupId: RuleGroupId)   => conditionActions.removeRuleOrGroup(nodeId, field, id, parentGroupId),
    changeCombinator : (ruleGroupId: RuleGroupId, combinator: "AND" | "OR")     => conditionActions.changeCombinator(nodeId, field, ruleGroupId, combinator),
})

export const conditionActions = {
    setLeftValue: (nodeId: Workflow.Node.Id, field: Foundations.Field, ruleId: RuleId, value: string) =>
        setValue(nodeId, field, (prev: Value) => { conditionReducers.setLeftValue(prev, ruleId, value); return prev; }),
    setOperator: (nodeId: Workflow.Node.Id, field: Foundations.Field, ruleId: RuleId, value: Operator, dataType?: DataType) =>
        setValue(nodeId, field, (prev: Value) => { conditionReducers.setOperator(prev, ruleId, value, dataType); return prev; }),
    setRightValue: (nodeId: Workflow.Node.Id, field: Foundations.Field, ruleId: RuleId, value: string) =>
        setValue(nodeId, field, (prev: Value) => { conditionReducers.setRightValue(prev, ruleId, value); return prev; }),
    addRule: (nodeId: Workflow.Node.Id, field: Foundations.Field, ruleGroupId: RuleGroupId) =>
        setValue(nodeId, field, (prev: Value) => { conditionReducers.addRule(prev, ruleGroupId); return prev; }),
    addGroup: (nodeId: Workflow.Node.Id, field: Foundations.Field, parentGroupId: RuleGroupId) =>
        setValue(nodeId, field, (prev: Value) => { conditionReducers.addGroup(prev, parentGroupId); return prev; }),
    removeRuleOrGroup: (nodeId: Workflow.Node.Id, field: Foundations.Field, id: RuleId | RuleGroupId, parentGroupId: RuleGroupId) =>
        setValue(nodeId, field, (prev: Value) => { conditionReducers.removeRuleOrGroup(prev, id, parentGroupId); return prev; }),
    changeCombinator: (nodeId: Workflow.Node.Id, field: Foundations.Field, ruleGroupId: RuleGroupId, combinator: "AND" | "OR") =>
        setValue(nodeId, field, (prev: Value) => { conditionReducers.changeCombinator(prev, ruleGroupId, combinator); return prev; }),
}
