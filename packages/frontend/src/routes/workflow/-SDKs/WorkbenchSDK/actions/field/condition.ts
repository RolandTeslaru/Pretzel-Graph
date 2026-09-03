import type { WorkbenchSDKImpl } from "../../sdk";
import { withCommit } from "../../utils/actions";
import type { Field } from "@pretzel-graph/shared/domain/Foundations/Field";
import type { Workflow } from "@pretzel-graph/shared/domain";

type NodeId      = Workflow.Node.Id
type FieldId     = Field.Id
type RuleId      = Field.Condition.Rule.Id
type RuleGroupId = Field.Condition.RuleGroup.Id
type Operator    = Field.Condition.Operator
type DataType    = Field.Condition.DataType

export function createConditionActions(
    sdk: WorkbenchSDKImpl,
    validateFieldById: (nodeId: NodeId, fieldId: FieldId) => void
) {
    const setDocument = sdk.setDocument;
    const reducers = sdk.reducers;

    return {
        setLeftValue: withCommit((nodeId, fieldId, ruleId, value) => {
            setDocument(d => { reducers.field.condition.setLeftValue(d, nodeId, fieldId, ruleId, value) })
            validateFieldById(nodeId, fieldId)
        }),
        setRightValue: withCommit((nodeId, fieldId, ruleId, value) => {
            setDocument(d => { reducers.field.condition.setRightValue(d, nodeId, fieldId, ruleId, value) })
            validateFieldById(nodeId, fieldId)
        }),
        setLeftIsExpression: withCommit((nodeId, fieldId, ruleId, value) => {
            setDocument(d => { reducers.field.condition.setLeftIsExpression(d, nodeId, fieldId, ruleId, value) })
            validateFieldById(nodeId, fieldId)
        }),
        setRightIsExpression: withCommit((nodeId, fieldId, ruleId, value) => {
            setDocument(d => { reducers.field.condition.setRightIsExpression(d, nodeId, fieldId, ruleId, value) })
            validateFieldById(nodeId, fieldId)
        }),
        setOperator: withCommit((nodeId, fieldId, ruleId, value, dataType) => {
            setDocument(d => { reducers.field.condition.setOperator(d, nodeId, fieldId, ruleId, value, dataType) })
            validateFieldById(nodeId, fieldId)
        }),
        addRule: withCommit((nodeId, fieldId, ruleGroupId) => {
            setDocument(d => { reducers.field.condition.addRule(d, nodeId, fieldId, ruleGroupId) })
            validateFieldById(nodeId, fieldId)
        }),
        addGroup: withCommit((nodeId, fieldId, parentGroupId) => {
            setDocument(d => { reducers.field.condition.addGroup(d, nodeId, fieldId, parentGroupId) })
            validateFieldById(nodeId, fieldId)
        }),
        removeRuleOrGroup: withCommit((nodeId, fieldId, id, parentGroupId) => {
            setDocument(d => { reducers.field.condition.removeRuleOrGroup(d, nodeId, fieldId, id, parentGroupId) })
            validateFieldById(nodeId, fieldId)
        }),
        changeCombinator: withCommit((nodeId, fieldId, ruleGroupId, combinator) => {
            setDocument(d => { reducers.field.condition.changeCombinator(d, nodeId, fieldId, ruleGroupId, combinator) })
            validateFieldById(nodeId, fieldId)
        }),
    } satisfies ConditionActions
}


export interface ConditionActions {
    setLeftValue     : (nodeId: NodeId, fieldId: FieldId, ruleId: RuleId, value: string) => void
    setRightValue    : (nodeId: NodeId, fieldId: FieldId, ruleId: RuleId, value: string) => void
    setLeftIsExpression : (nodeId: NodeId, fieldId: FieldId, ruleId: RuleId, value: boolean) => void
    setRightIsExpression: (nodeId: NodeId, fieldId: FieldId, ruleId: RuleId, value: boolean) => void
    setOperator      : (nodeId: NodeId, fieldId: FieldId, ruleId: RuleId, value: Operator, dataType?: DataType) => void
    addRule          : (nodeId: NodeId, fieldId: FieldId, ruleGroupId: RuleGroupId) => void
    addGroup         : (nodeId: NodeId, fieldId: FieldId, parentGroupId: RuleGroupId) => void
    removeRuleOrGroup: (nodeId: NodeId, fieldId: FieldId, id: RuleId | RuleGroupId, parentGroupId: RuleGroupId) => void
    changeCombinator : (nodeId: NodeId, fieldId: FieldId, ruleGroupId: RuleGroupId, combinator: "AND" | "OR") => void
}
