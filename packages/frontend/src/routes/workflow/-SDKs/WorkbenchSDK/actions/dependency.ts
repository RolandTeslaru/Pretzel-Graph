import type { Workflow } from "@pretzel-graph/shared/domain"
import type { Field } from "@pretzel-graph/shared/domain/Foundations/Field"
import type { WorkbenchSDKImpl } from "../sdk"
import { withCommit, debouncedValidateField } from "../utils/actions"

export function createDependencyActions(sdk: WorkbenchSDKImpl) {
    const setState = sdk.useStore.setState
    const reducers = sdk.reducers

    return {
        setWorkflowId: withCommit((nodeId: Workflow.Node.Id, field: Field.DependencySelector, workflowId: Workflow.Id | "") => {
            
            
            setState(s => { reducers.dependency.setWorkflowId(s, nodeId, field.id, workflowId) })
            debouncedValidateField(nodeId, field)
        })
    } satisfies DependencyActions
}

export type DependencyActions = {
    setWorkflowId: (nodeId: Workflow.Node.Id, field: Field.DependencySelector, workflowId: Workflow.Id | "") => void
}
