import { Validation, type Foundations, type Workflow } from "@vx-agent-editor/shared/domain";
import type { WorkbenchSDK } from "../sdk";

export const fieldReducers = {
    setValue: (s, nodeId, fieldId, value) => {
        s.isDirty = true;
        const cur = s.workflow.data.staticValues[nodeId][fieldId]

        const next = typeof value === "function" ? value(cur as any) : value
        s.workflow.data.staticValues[nodeId][fieldId] = next
    },
    validate: (s, nodeId, field) => {
        const issue = Validation.Issue.Field.check(field, nodeId, s.workflow)

        if (issue){
            s.issues[nodeId].fields[field.id] = issue;
            return true;
        }

        delete s.issues[nodeId].fields[field.id];

        return false;
    }
} satisfies FieldReducers


type FieldReducers = {
    setValue: (
        state: WorkbenchSDK.State,
        nodeId: Workflow.Node.Id,
        fieldId: Foundations.Field.Id,
        next: Foundations.Field.Value | ((value: Foundations.Field.Value) => Foundations.Field.Value)
    ) => void
    validate: (
        state: WorkbenchSDK.State,
        nodeId: Workflow.Node.Id,
        field: Foundations.Field
    ) => boolean
}