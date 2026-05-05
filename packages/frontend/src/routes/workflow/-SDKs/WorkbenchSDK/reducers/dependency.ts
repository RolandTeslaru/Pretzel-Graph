import type { Workflow, Foundations } from "@pretzel-graph/shared/domain"
import type { WorkbenchSDK } from "../sdk"

export const dependencyReducers = {
    setWorkflowId: (
        s: WorkbenchSDK.State,
        nodeId: Workflow.Node.Id,
        fieldId: Foundations.Field.Id,
        workflowId: Workflow.Id | ""
    ) => {
        s.isDirty = true
        s.workflow.data.staticValues[nodeId][fieldId] = workflowId
    }
}
