import type { Document } from "../index";
import type { Field } from "../../../Foundations/Field";
import type { Workflow } from "../../../Workflow";

type NodeId = Workflow.Node.Id
type ConditionValue = Field.Condition.Value

export interface ConditionSelectors {
    getValue:     (document: Document, nodeId: NodeId, fieldId: Field.Id) => ConditionValue | null
    getRule:      (document: Document, nodeId: NodeId, fieldId: Field.Id, ruleId: Field.Condition.Rule.Id) => Field.Condition.Rule | null
    getGroup:     (document: Document, nodeId: NodeId, fieldId: Field.Id, ruleGroupId: Field.Condition.RuleGroup.Id) => Field.Condition.RuleGroup | null
    getChildKind: (document: Document, nodeId: NodeId, fieldId: Field.Id, id: Field.Condition.Rule.Id | Field.Condition.RuleGroup.Id) => 'rule' | 'group' | null
}

export const conditionSelectors = {
    getValue: (d, nodeId, fieldId) =>
        d.data.staticValues[nodeId]?.[fieldId]
            ?? (d.selectors.field.get(d, nodeId, fieldId) as Field.Condition | null)?.initialValue
            ?? null,
    getRule: (d, nodeId, fieldId, ruleId) => {
        const condition = conditionSelectors.getValue(d, nodeId, fieldId)
        if (!condition) return null
        return condition.rules[ruleId] ?? null
    },
    getGroup: (d, nodeId, fieldId, ruleGroupId) => {
        const condition = conditionSelectors.getValue(d, nodeId, fieldId)
        if (!condition) return null
        return condition.groups[ruleGroupId] ?? null
    },
    getChildKind: (d, nodeId, fieldId, id) => {
        const condition = conditionSelectors.getValue(d, nodeId, fieldId)
        if (!condition) return null
        if (id in condition.rules) return 'rule' as const
        if (id in condition.groups) return 'group' as const
        return null
    },
} as ConditionSelectors
