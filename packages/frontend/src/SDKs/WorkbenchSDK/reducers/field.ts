import type { Foundations, Workflow } from "@vx-agent-editor/shared/domain";
import type { WorkbenchSDK } from "../sdk";
import { Validator } from "@vx-agent-editor/shared/validators"

export const fieldReducers = {
    setValue: (s, nodeId, fieldId, value) => {
        s.isDirty = true;
        s.workflow.data.staticValues[nodeId][fieldId] = value
    },
    validate: (s, nodeId, field) => {
        const issue = Validator.validateField(s.workflow, nodeId, field);

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
        value: Foundations.Field.Value
    ) => void
    validate: (
        state: WorkbenchSDK.State,
        nodeId: Workflow.Node.Id,
        field: Foundations.Field
    ) => boolean
}