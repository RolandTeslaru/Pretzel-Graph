import { Validation, Foundations, type Workflow } from "@pretzel-graph/shared/domain";
import type { WorkbenchSDK } from "../sdk";
import { conditionTreeReducers } from "./conditionTree";
import { workbenchSelectors } from "../selectors";

type CaseListEntry = Foundations.Field.CaseList.Entry
type RuleId = Foundations.Field.Condition.Rule.Id
type RuleGroupId = Foundations.Field.Condition.RuleGroup.Id
type Operator = Foundations.Field.Condition.Operator
type DataType = Foundations.Field.Condition.DataType

const replaceCaseListEntry = (
    s: WorkbenchSDK.State,
    nodeId: Workflow.Node.Id,
    fieldId: Foundations.Field.Id,
    portId: Foundations.Port.Output.Id,
    entry: CaseListEntry
) => {
    const caseList = workbenchSelectors.field.caseList.getValue(s, nodeId, fieldId)!
    const index = caseList.findIndex(item => item.portId === portId)
    if (index === -1)
        throw new Error(`CaseList entry ${portId} not found in field ${fieldId} on node ${nodeId}`)

    caseList[index] = entry
}

export const fieldReducers = {
    setValue: (s, nodeId, fieldId, value) => {
        s.isDirty = true;
        const cur = s.data.staticValues[nodeId][fieldId]

        const next = typeof value === "function" ? value(cur as any) : value
        s.data.staticValues[nodeId][fieldId] = next
    },
    clearDependentFields: (s, nodeId, changedFieldId) => {
        const node = workbenchSelectors.node.get(s, nodeId)
        if (!node) return

        for (const sibling of node.fields) {
            if (
                sibling.variant === "ResourceLoader" &&
                sibling.id !== changedFieldId &&
                sibling.dependsOn.includes(changedFieldId)
            ) {
                s.data.staticValues[nodeId][sibling.id] = { mode: "list", value: "" }
                s.isDirty = true
            }
        }
    },
    validate: (s, nodeId, field) => {
        const issue = Validation.Issue.Field.check(field, nodeId, s.data)

        if (issue) {
            s.issues.nodes[nodeId].fields[field.id] = issue;
            return true;
        }

        delete s.issues.nodes[nodeId]?.fields?.[field.id];

        return false;
    },
    markAsReconciling: (s, nodeId, fieldId) => {
        if (!s.reconcilingFields[nodeId])
            s.reconcilingFields[nodeId] = new Set();

        s.reconcilingFields[nodeId].add(fieldId);
    },
    unmarkAsReconciling: (s, nodeId, fieldId) => {
        s.reconcilingFields[nodeId]?.delete(fieldId);
    },
    setIsExpression: (s, nodeId, fieldId, value) => {
        const field = s.selectors.field.get(s, nodeId, fieldId)
        if (!field) return;

        if(field.variant === "String" || field.variant === "UniqueString") {
            field.isExpression = value
            s.isDirty = true;
        } else {
            console.warn(`Tried to set isExpression on non-string field ${fieldId} on node ${nodeId}`)
            return;
        }
    },
    condition: {
        setLeftValue: (s, nodeId, fieldId, ruleId, value) => {
            const condition = workbenchSelectors.field.condition.getValue(s, nodeId, fieldId)!
            conditionTreeReducers.setLeftValue(condition, ruleId, value)
            s.isDirty = true
        },
        setOperator: (s, nodeId, fieldId, ruleId, value, dataType) => {
            const condition = workbenchSelectors.field.condition.getValue(s, nodeId, fieldId)!
            conditionTreeReducers.setOperator(condition, ruleId, value, dataType)
            s.isDirty = true
        },
        setRightValue: (s, nodeId, fieldId, ruleId, value) => {
            const condition = workbenchSelectors.field.condition.getValue(s, nodeId, fieldId)!
            conditionTreeReducers.setRightValue(condition, ruleId, value)
            s.isDirty = true
        },
        addRule: (s, nodeId, fieldId, ruleGroupId) => {
            const condition = workbenchSelectors.field.condition.getValue(s, nodeId, fieldId)!
            conditionTreeReducers.addRule(condition, ruleGroupId)
            s.isDirty = true
        },
        addGroup: (s, nodeId, fieldId, parentGroupId) => {
            const condition = workbenchSelectors.field.condition.getValue(s, nodeId, fieldId)!
            conditionTreeReducers.addGroup(condition, parentGroupId)
            s.isDirty = true
        },
        removeRuleOrGroup: (s, nodeId, fieldId, id, parentGroupId) => {
            const condition = workbenchSelectors.field.condition.getValue(s, nodeId, fieldId)!
            conditionTreeReducers.removeRuleOrGroup(condition, id, parentGroupId)
            s.isDirty = true
        },
        changeCombinator: (s, nodeId, fieldId, ruleGroupId, combinator) => {
            const condition = workbenchSelectors.field.condition.getValue(s, nodeId, fieldId)!
            conditionTreeReducers.changeCombinator(condition, ruleGroupId, combinator)
            s.isDirty = true
        },
    },
    caseList: {
        addEntry: (s, nodeId, fieldId, entry) => {
            const caseList = workbenchSelectors.field.caseList.getValue(s, nodeId, fieldId)!
            s.data.staticValues[nodeId][fieldId] = [...caseList, entry]
            s.isDirty = true
        },
        removeEntry: (s, nodeId, fieldId, portId) => {
            const caseList = workbenchSelectors.field.caseList.getValue(s, nodeId, fieldId)!
            const next = caseList.filter(entry => entry.portId !== portId)
            s.data.staticValues[nodeId][fieldId] = next
            s.isDirty = true
        },
        setLabel: (s, nodeId, fieldId, portId, label) => {
            const entry = workbenchSelectors.field.caseList.getEntry(s, nodeId, fieldId, portId)!
            entry.label = label
            replaceCaseListEntry(s, nodeId, fieldId, portId, { ...entry })
            s.isDirty = true
        },
        condition: {
            setLeftValue: (s, nodeId, fieldId, portId, ruleId, value) => {
                const entry = workbenchSelectors.field.caseList.getEntry(s, nodeId, fieldId, portId)!
                conditionTreeReducers.setLeftValue(entry.condition, ruleId, value)
                replaceCaseListEntry(s, nodeId, fieldId, portId, { ...entry })
                s.isDirty = true
            },
            setRightValue: (s, nodeId, fieldId, portId, ruleId, value) => {
                const entry = workbenchSelectors.field.caseList.getEntry(s, nodeId, fieldId, portId)!
                conditionTreeReducers.setRightValue(entry.condition, ruleId, value)
                replaceCaseListEntry(s, nodeId, fieldId, portId, { ...entry })
                s.isDirty = true
            },
            setOperator: (s, nodeId, fieldId, portId, ruleId, value, dataType) => {
                const entry = workbenchSelectors.field.caseList.getEntry(s, nodeId, fieldId, portId)!
                conditionTreeReducers.setOperator(entry.condition, ruleId, value, dataType)
                replaceCaseListEntry(s, nodeId, fieldId, portId, { ...entry })
                s.isDirty = true
            },
            addRule: (s, nodeId, fieldId, portId, ruleGroupId) => {
                const entry = workbenchSelectors.field.caseList.getEntry(s, nodeId, fieldId, portId)!
                conditionTreeReducers.addRule(entry.condition, ruleGroupId)
                replaceCaseListEntry(s, nodeId, fieldId, portId, { ...entry })
                s.isDirty = true
            },
            addGroup: (s, nodeId, fieldId, portId, parentGroupId) => {
                const entry = workbenchSelectors.field.caseList.getEntry(s, nodeId, fieldId, portId)!
                conditionTreeReducers.addGroup(entry.condition, parentGroupId)
                replaceCaseListEntry(s, nodeId, fieldId, portId, { ...entry })
                s.isDirty = true
            },
            removeRuleOrGroup: (s, nodeId, fieldId, portId, id, parentGroupId) => {
                const entry = workbenchSelectors.field.caseList.getEntry(s, nodeId, fieldId, portId)!
                conditionTreeReducers.removeRuleOrGroup(entry.condition, id, parentGroupId)
                replaceCaseListEntry(s, nodeId, fieldId, portId, { ...entry })
                s.isDirty = true
            },
            changeCombinator: (s, nodeId, fieldId, portId, ruleGroupId, combinator) => {
                const entry = workbenchSelectors.field.caseList.getEntry(s, nodeId, fieldId, portId)!
                conditionTreeReducers.changeCombinator(entry.condition, ruleGroupId, combinator)
                replaceCaseListEntry(s, nodeId, fieldId, portId, { ...entry })
                s.isDirty = true
            },
        },
    }
} satisfies FieldReducers


type FieldReducers = {
    setValue: (
        state: WorkbenchSDK.State,
        nodeId: Workflow.Node.Id,
        fieldId: Foundations.Field.Id,
        next: Foundations.Field.Value | ((value: Foundations.Field.Value) => Foundations.Field.Value)
    ) => void
    clearDependentFields: (
        state: WorkbenchSDK.State,
        nodeId: Workflow.Node.Id,
        changedFieldId: Foundations.Field.Id,
    ) => void
    validate: (
        state: WorkbenchSDK.State,
        nodeId: Workflow.Node.Id,
        field: Foundations.Field
    ) => boolean
    markAsReconciling: (
        state: WorkbenchSDK.State,
        nodeId: Workflow.Node.Id,
        fieldId: Foundations.Field.Id
    ) => void
    unmarkAsReconciling: (
        state: WorkbenchSDK.State,
        nodeId: Workflow.Node.Id,
        fieldId: Foundations.Field.Id
    ) => void
    setIsExpression: (
        state: WorkbenchSDK.State,
        nodeId: Workflow.Node.Id,
        fieldId: Foundations.Field.Id,
        value: boolean
    ) => void
    condition: {
        setLeftValue: (
            state: WorkbenchSDK.State,
            nodeId: Workflow.Node.Id,
            fieldId: Foundations.Field.Id,
            ruleId: RuleId,
            value: string
        ) => void
        setRightValue: (
            state: WorkbenchSDK.State,
            nodeId: Workflow.Node.Id,
            fieldId: Foundations.Field.Id,
            ruleId: RuleId,
            value: string
        ) => void
        setOperator: (
            state: WorkbenchSDK.State,
            nodeId: Workflow.Node.Id,
            fieldId: Foundations.Field.Id,
            ruleId: RuleId,
            value: Operator,
            dataType?: DataType
        ) => void
        addRule: (
            state: WorkbenchSDK.State,
            nodeId: Workflow.Node.Id,
            fieldId: Foundations.Field.Id,
            ruleGroupId: RuleGroupId
        ) => void
        addGroup: (
            state: WorkbenchSDK.State,
            nodeId: Workflow.Node.Id,
            fieldId: Foundations.Field.Id,
            parentGroupId: RuleGroupId
        ) => void
        removeRuleOrGroup: (
            state: WorkbenchSDK.State,
            nodeId: Workflow.Node.Id,
            fieldId: Foundations.Field.Id,
            id: RuleId | RuleGroupId,
            parentGroupId: RuleGroupId
        ) => void
        changeCombinator: (
            state: WorkbenchSDK.State,
            nodeId: Workflow.Node.Id,
            fieldId: Foundations.Field.Id,
            ruleGroupId: RuleGroupId,
            combinator: "AND" | "OR"
        ) => void
    }
    caseList: {
        addEntry: (
            state: WorkbenchSDK.State,
            nodeId: Workflow.Node.Id,
            fieldId: Foundations.Field.Id,
            entry: CaseListEntry
        ) => void
        removeEntry: (
            state: WorkbenchSDK.State,
            nodeId: Workflow.Node.Id,
            fieldId: Foundations.Field.Id,
            portId: Foundations.Port.Output.Id
        ) => void
        setLabel: (
            state: WorkbenchSDK.State,
            nodeId: Workflow.Node.Id,
            fieldId: Foundations.Field.Id,
            portId: Foundations.Port.Output.Id,
            label: string
        ) => void
        condition: {
            setLeftValue: (
                state: WorkbenchSDK.State,
                nodeId: Workflow.Node.Id,
                fieldId: Foundations.Field.Id,
                portId: Foundations.Port.Output.Id,
                ruleId: RuleId,
                value: string
            ) => void
            setRightValue: (
                state: WorkbenchSDK.State,
                nodeId: Workflow.Node.Id,
                fieldId: Foundations.Field.Id,
                portId: Foundations.Port.Output.Id,
                ruleId: RuleId,
                value: string
            ) => void
            setOperator: (
                state: WorkbenchSDK.State,
                nodeId: Workflow.Node.Id,
                fieldId: Foundations.Field.Id,
                portId: Foundations.Port.Output.Id,
                ruleId: RuleId,
                value: Operator,
                dataType?: DataType
            ) => void
            addRule: (
                state: WorkbenchSDK.State,
                nodeId: Workflow.Node.Id,
                fieldId: Foundations.Field.Id,
                portId: Foundations.Port.Output.Id,
                ruleGroupId: RuleGroupId
            ) => void
            addGroup: (
                state: WorkbenchSDK.State,
                nodeId: Workflow.Node.Id,
                fieldId: Foundations.Field.Id,
                portId: Foundations.Port.Output.Id,
                parentGroupId: RuleGroupId
            ) => void
            removeRuleOrGroup: (
                state: WorkbenchSDK.State,
                nodeId: Workflow.Node.Id,
                fieldId: Foundations.Field.Id,
                portId: Foundations.Port.Output.Id,
                id: RuleId | RuleGroupId,
                parentGroupId: RuleGroupId
            ) => void
            changeCombinator: (
                state: WorkbenchSDK.State,
                nodeId: Workflow.Node.Id,
                fieldId: Foundations.Field.Id,
                portId: Foundations.Port.Output.Id,
                ruleGroupId: RuleGroupId,
                combinator: "AND" | "OR"
            ) => void
        }
    }
}
