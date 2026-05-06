import { Foundations, SystemError, Workbench, type Workflow } from "@pretzel-graph/shared/domain"
import type { WorkbenchSDKImpl } from "../sdk"
import { withCommit, withAsyncCommit, withCyclesRecompute, debouncedValidateField } from "../utils/actions"
import { api } from "@/SDKs/ApiInterceptorSDK"
import { toast } from "sonner"
import type { Field } from "@pretzel-graph/shared/domain/Foundations/Field"
import { extractExposedPorts } from "@pretzel-graph/shared/subworkflow"
import { ShelfSDK } from "../../ShelfSDK/sdk"

export function createDependencyActions(sdk: WorkbenchSDKImpl) {
    const setState = sdk.useStore.setState
    const reducers = sdk.reducers

    return {
        registerDependency: withCommit((dependency) => {
            setState(s => {
                s.data.dependencies = s.data.dependencies ?? {}
                s.data.dependencies[dependency.workflow_id] = dependency
            })
        }),
        load: withAsyncCommit(async (dependencyId) => {
            try {
                const { dependency } = await Workbench.API.Dependency.load(api, { dependencyId })
                setState(s => {
                    reducers.dependency.registerDependency(s, dependency)
                })
            } catch (err) {
                const error = SystemError.fromUnknown(err)
                console.error("Failed to resolve dependency", error)
                toast.error(`Failed to resolve dependency: ${error.message}`)
                return false
            }
            return true
        }),
        attachWorkflowToNode: withAsyncCommit(async (nodeId, fieldId, workflowId) => {
            try {
                const { dependency } = await Workbench.API.Dependency.load(api, { dependencyId: workflowId })
                
                const blueprint = ShelfSDK.state.blueprints["Core.SubWorkflow.Execute" as Foundations.Blueprint.Id]

                const subflowBlueprint = {
                    ...blueprint,
                    ... extractExposedPorts(dependency.workflow_data),
                    displayName: dependency.display_name,
                    icon: dependency.icon ?? blueprint.icon,
                    accent: dependency.accent ?? blueprint.accent,
                } satisfies Foundations.Blueprint

                setState(withCyclesRecompute(s => {                
                    reducers.dependency.registerDependency(s, dependency)

                    reducers.node.recreate(s, nodeId, subflowBlueprint)

                    reducers.field.setValue(s, nodeId, fieldId, workflowId)

                    const field = s.data.nodes[nodeId].fields.find(f => f.id === fieldId)
                    if(field)
                        reducers.field.validate(s, nodeId, field)
                }))
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
    registerDependency: (dependency: Workflow.Dependency) => void
    load: (dependencyId: Workflow.Id) => Promise<boolean>
    attachWorkflowToNode: (nodeId: Workflow.Node.Id, fieldId: Field.Id, workflowId: Workflow.Id) => Promise<boolean>
}
