import { SystemError, Workbench, type VersionControl, type Workflow } from "@pretzel-graph/shared/domain"
import type { Field } from "@pretzel-graph/shared/domain/Foundations/Field"
import type { WorkbenchSDKImpl } from "../sdk"
import { withCommit, debouncedValidateField, withAsyncCommit } from "../utils/actions"
import { api } from "@/SDKs/ApiInterceptorSDK"
import { toast } from "sonner"

export function createDependencyActions(sdk: WorkbenchSDKImpl) {
    const setState = sdk.useStore.setState
    const reducers = sdk.reducers

    return {
        registerDependency: withCommit((publication) => {
            setState(s => {
                s.data.dependencies = s.data.dependencies ?? {}
                s.data.dependencies[publication.workflow_id] = publication
            })
        }),
        resolveByWorkflowId: withAsyncCommit(async (workflowId) => {
            try {
                const { publication } = await Workbench.API.Dependency.resolveWorkflow(api, { workflowId })
                setState(s => {
                    reducers.dependency.registerDependency(s, publication)
                })
            } catch (err) {
                const error = SystemError.fromUnknown(err)
                console.error("Failed to resolve dependency", error)
                toast.error(`Failed to resolve dependency: ${error.message}`)
                return false
            }
            return true
        })
    } satisfies DependencyActions
}   

export type DependencyActions = {
    registerDependency: (publication: VersionControl.Publication) => void
    resolveByWorkflowId: (workflowId: Workflow.Id) => Promise<boolean>
}
