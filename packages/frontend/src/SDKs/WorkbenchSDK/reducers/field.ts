import type { Foundations, Workflow } from "@vx-agent-editor/shared/domain";
import type { WorkbenchSDK } from "../sdk";

export const fieldReducers = {
    setValue: (s, nodeId, fieldId, value) => {
        s.isDirty = true;
        const node = s.workflow.data.nodes[nodeId]
        if (!node) {
            throw new Error(`Node ${nodeId} not found`)
        }
        const field = node.fields.find(f => f.id === fieldId)
        if (!field) {
            throw new Error(`Field ${fieldId} not found`)
        }
        s.workflow.data.staticValues[nodeId][fieldId] = value

        if(field.reconcile){
            
        }
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