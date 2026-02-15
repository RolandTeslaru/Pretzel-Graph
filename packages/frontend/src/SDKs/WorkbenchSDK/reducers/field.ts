import type { Foundations, Workflow } from "@vx-agent-editor/shared/domain";
import type { WorkbenchSDK } from "../sdk";

export const fieldReducers = {
    setValue: (s, nodeId, fieldId, value) => {
        s.isDirty = true;
        s.workflow.data.staticValues[nodeId][fieldId] = value
    }
} satisfies FieldReducers


type FieldReducers = {
    setValue: (
        state: WorkbenchSDK.State,
        nodeId: Workflow.Node.Id,
        fieldId: Foundations.Field.Id,
        value: Foundations.Field.Value
    ) => void
}