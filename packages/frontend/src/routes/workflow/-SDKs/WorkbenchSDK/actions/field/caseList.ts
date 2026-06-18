import type { WorkbenchSDKImpl } from "../../sdk";
import { withCommit } from "../../utils/actions";
import { Field } from "@pretzel-graph/shared/domain/Foundations/Field";
import { Port } from "@pretzel-graph/shared/domain/Foundations/Port";
import type { Workflow } from "@pretzel-graph/shared/domain";

type NodeId      = Workflow.Node.Id
type FieldId     = Field.Id
type PortId      = Port.Output.Id
type RuleId      = Field.Condition.Rule.Id
type RuleGroupId = Field.Condition.RuleGroup.Id
type Operator    = Field.Condition.Operator
type DataType    = Field.Condition.DataType

export function createCaseListActions(
    sdk: WorkbenchSDKImpl,
    validateFieldById: (nodeId: NodeId, fieldId: FieldId) => void
) {
    const setState = sdk.useStore.setState;
    const reducers = sdk.reducers;
    const sel      = sdk.selectors;

    return {
        addEntry: withCommit((nodeId, fieldId, label) => {
            const portId = Port.Output.Id.parse(crypto.randomUUID())
            const entry  = Field.CaseList.createEntry(portId, label)

            setState(s => {
                reducers.field.caseList.addEntry(s, nodeId, fieldId, entry)

                const resolvedVariant = sel.port.polymorphism.getResolvedVariantInGroup(s, nodeId, "condition") ?? "Unresolved"

                reducers.port.addOutput(s, nodeId, {
                    id: portId,
                    displayName: label,
                    variant: resolvedVariant,
                    polymorphicGroupId: "condition",
                    originalVariant: "Unresolved",
                })
            })

            validateFieldById(nodeId, fieldId)
        }),

        removeEntry: withCommit((nodeId, fieldId, portId) => {
            setState(s => {
                reducers.field.caseList.removeEntry(s, nodeId, fieldId, portId)
                reducers.port.removeOutput(s, nodeId, portId)
            })
            validateFieldById(nodeId, fieldId)
        }),

        setLabel: withCommit((nodeId, fieldId, portId, label) => {
            setState(s => {
                reducers.field.caseList.setLabel(s, nodeId, fieldId, portId, label)
                reducers.port.setOutputDisplayName(s, nodeId, portId, label)
            })
            validateFieldById(nodeId, fieldId)
        }),

        condition: {
            setLeftValue: withCommit((nodeId, fieldId, portId, ruleId, value) => {
                setState(s => { reducers.field.caseList.condition.setLeftValue(s, nodeId, fieldId, portId, ruleId, value) })
                validateFieldById(nodeId, fieldId)
            }),
            setRightValue: withCommit((nodeId, fieldId, portId, ruleId, value) => {
                setState(s => { reducers.field.caseList.condition.setRightValue(s, nodeId, fieldId, portId, ruleId, value) })
                validateFieldById(nodeId, fieldId)
            }),
            setLeftIsExpression: withCommit((nodeId, fieldId, portId, ruleId, value) => {
                setState(s => { reducers.field.caseList.condition.setLeftIsExpression(s, nodeId, fieldId, portId, ruleId, value) })
                validateFieldById(nodeId, fieldId)
            }),
            setRightIsExpression: withCommit((nodeId, fieldId, portId, ruleId, value) => {
                setState(s => { reducers.field.caseList.condition.setRightIsExpression(s, nodeId, fieldId, portId, ruleId, value) })
                validateFieldById(nodeId, fieldId)
            }),
            setOperator: withCommit((nodeId, fieldId, portId, ruleId, value, dataType) => {
                setState(s => { reducers.field.caseList.condition.setOperator(s, nodeId, fieldId, portId, ruleId, value, dataType) })
                validateFieldById(nodeId, fieldId)
            }),
            addRule: withCommit((nodeId, fieldId, portId, ruleGroupId) => {
                setState(s => { reducers.field.caseList.condition.addRule(s, nodeId, fieldId, portId, ruleGroupId) })
                validateFieldById(nodeId, fieldId)
            }),
            addGroup: withCommit((nodeId, fieldId, portId, parentGroupId) => {
                setState(s => { reducers.field.caseList.condition.addGroup(s, nodeId, fieldId, portId, parentGroupId) })
                validateFieldById(nodeId, fieldId)
            }),
            removeRuleOrGroup: withCommit((nodeId, fieldId, portId, id, parentGroupId) => {
                setState(s => { reducers.field.caseList.condition.removeRuleOrGroup(s, nodeId, fieldId, portId, id, parentGroupId) })
                validateFieldById(nodeId, fieldId)
            }),
            changeCombinator: withCommit((nodeId, fieldId, portId, ruleGroupId, combinator) => {
                setState(s => { reducers.field.caseList.condition.changeCombinator(s, nodeId, fieldId, portId, ruleGroupId, combinator) })
                validateFieldById(nodeId, fieldId)
            }),
        },
    } satisfies CaseListActions
}


export interface CaseListActions {
    addEntry    : (nodeId: NodeId, fieldId: FieldId, label: string) => void
    removeEntry : (nodeId: NodeId, fieldId: FieldId, portId: PortId) => void
    setLabel    : (nodeId: NodeId, fieldId: FieldId, portId: PortId, label: string) => void
    condition: {
        setLeftValue     : (nodeId: NodeId, fieldId: FieldId, portId: PortId, ruleId: RuleId, value: string) => void
        setRightValue    : (nodeId: NodeId, fieldId: FieldId, portId: PortId, ruleId: RuleId, value: string) => void
        setLeftIsExpression : (nodeId: NodeId, fieldId: FieldId, portId: PortId, ruleId: RuleId, value: boolean) => void
        setRightIsExpression: (nodeId: NodeId, fieldId: FieldId, portId: PortId, ruleId: RuleId, value: boolean) => void
        setOperator      : (nodeId: NodeId, fieldId: FieldId, portId: PortId, ruleId: RuleId, value: Operator, dataType?: DataType) => void
        addRule          : (nodeId: NodeId, fieldId: FieldId, portId: PortId, ruleGroupId: RuleGroupId) => void
        addGroup         : (nodeId: NodeId, fieldId: FieldId, portId: PortId, parentGroupId: RuleGroupId) => void
        removeRuleOrGroup: (nodeId: NodeId, fieldId: FieldId, portId: PortId, id: RuleId | RuleGroupId, parentGroupId: RuleGroupId) => void
        changeCombinator : (nodeId: NodeId, fieldId: FieldId, portId: PortId, ruleGroupId: RuleGroupId, combinator: "AND" | "OR") => void
    }
}
