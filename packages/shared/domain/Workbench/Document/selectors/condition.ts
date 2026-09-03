import type { WorkbenchSDK } from "../sdk";
import type { Field } from '@pretzel-graph/shared/domain/Foundations/Field';
import type { Workflow } from '@pretzel-graph/shared/domain';

type NodeId = Workflow.Node.Id
type ConditionValue = Field.Condition.Value

export interface ConditionSelectors {
    getValue:     (state: WorkbenchSDK.State, nodeId: NodeId, fieldId: Field.Id) => ConditionValue | null
    getRule:      (state: WorkbenchSDK.State, nodeId: NodeId, fieldId: Field.Id, ruleId: Field.Condition.Rule.Id) => Field.Condition.Rule | null
    getGroup:     (state: WorkbenchSDK.State, nodeId: NodeId, fieldId: Field.Id, ruleGroupId: Field.Condition.RuleGroup.Id) => Field.Condition.RuleGroup | null
    getChildKind: (state: WorkbenchSDK.State, nodeId: NodeId, fieldId: Field.Id, id: Field.Condition.Rule.Id | Field.Condition.RuleGroup.Id) => 'rule' | 'group' | null
}

export const conditionSelectors = {
    getValue: (s, nodeId, fieldId) =>
        s.data.staticValues[nodeId]?.[fieldId]
            ?? (s.selectors.field.get(s, nodeId, fieldId) as Field.Condition | null)?.initialValue
            ?? null,
    getRule: (s, nodeId, fieldId, ruleId) => {
        const condition = conditionSelectors.getValue(s, nodeId, fieldId)
        if (!condition) return null
        return condition.rules[ruleId] ?? null
    },
    getGroup: (s, nodeId, fieldId, ruleGroupId) => {
        const condition = conditionSelectors.getValue(s, nodeId, fieldId)
        if (!condition) return null
        return condition.groups[ruleGroupId] ?? null
    },
    getChildKind: (s, nodeId, fieldId, id) => {
        const condition = conditionSelectors.getValue(s, nodeId, fieldId)
        if (!condition) return null
        if (id in condition.rules) return 'rule' as const
        if (id in condition.groups) return 'group' as const
        return null
    },
} as ConditionSelectors
