import { Foundations, SystemError, Workbench, type Workflow } from "@pretzel-graph/shared/domain"
import type { VersionControlPublication } from "@pretzel-graph/shared/domain/VersionControlPublication"
import type { WorkbenchSDKImpl } from "../sdk"
import { withCommit, withAsyncCommit, withCyclesRecompute } from "../utils/actions"
import { api } from "@/SDKs/ApiInterceptorSDK"
import { toast } from "sonner"
import type { Field } from "@pretzel-graph/shared/domain/Foundations/Field"
import { extractExposedPorts } from "@pretzel-graph/shared/subworkflow"
import { ShelfSDK } from "../../ShelfSDK/sdk"

export function createDependencyActions(sdk: WorkbenchSDKImpl) {
    const setState = sdk.useStore.setState
    const reducers = sdk.reducers

    const applyUpdate = async (updateInfo: Workflow.Dependency.UpdateInfo): Promise<boolean> => {
        try {
            const { dependency } = await Workbench.API.Dependency.load(api, { dependencyId: updateInfo.workflowId })

            setState(withCyclesRecompute(s => {
                reducers.dependency.registerDependency(s, dependency)

                const affectedNodeIds = Object.values(s.data.nodes)
                    .filter(n => n.workflowDependencyId === updateInfo.workflowId)
                    .map(n => n.id)

                for (const affectedNodeId of affectedNodeIds) {
                    const keepSelector = !!(s.data.staticValues[affectedNodeId]?.["workflowId" as Field.Id])
                    const subflowBlueprint = createBlueprintFromDependency(dependency, keepSelector)
                    reducers.node.recreate(s, affectedNodeId, subflowBlueprint)
                    reducers.node.validate(s, affectedNodeId)
                }

                delete s.dependencyUpdates[updateInfo.workflowId]
            }))
        } catch (err) {
            const error = SystemError.fromUnknown(err)
            console.error("Failed to update dependency", error)
            toast.error(`Failed to update dependency: ${error.message}`)
            return false
        }
        return true
    }

    const actions = {
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
        checkUpdates: async () => {
            const dependencies = sdk.state.data.dependencies ?? {};

            const entries = Object.values(dependencies).map(dep => ({
                workflowId:    dep.workflow_id as Workflow.Id,
                publicationId: dep.id as VersionControlPublication.Id,
            }))

            if (entries.length === 0) {
                setState(s => { s.dependencyUpdates = {} })
                return
            }

            try {
                const { updates } = await Workbench.API.Dependency.checkUpdates(api, { dependencies: entries })
                setState(s => { s.dependencyUpdates = updates })
                const count = Object.keys(updates).length
                if (count > 0)
                    toast.info(`${count} dependency update${count === 1 ? '' : 's'} available`)
            } catch (err) {
                console.error("Failed to check dependency updates", err)
            }
        },

        attachWorkflowToNode: withAsyncCommit(async (nodeId: Workflow.Node.Id, fieldId: Field.Id, workflowId: Workflow.Id) => {
            try {
                const { dependency } = await Workbench.API.Dependency.load(api, { dependencyId: workflowId })
                const subflowBlueprint = createBlueprintFromDependency(dependency, true)
                const dependencyFields = dependency.workflow_data.fields ?? []

                setState(withCyclesRecompute(s => {
                    reducers.dependency.registerDependency(s, dependency)
                    reducers.node.recreate(s, nodeId, subflowBlueprint)
                    reducers.field.setValue(s, nodeId, fieldId, workflowId)

                    s.data.staticValues[nodeId] ??= {}
                    for (const field of dependencyFields) {
                        if (field.id in s.data.staticValues[nodeId]) continue
                        if ("initialValue" in field)
                            s.data.staticValues[nodeId][field.id] = field.initialValue
                    }

                    reducers.node.setWorkflowDependency(s, nodeId, workflowId)
                    reducers.node.validate(s, nodeId)
                }))
            } catch (err) {
                const error = SystemError.fromUnknown(err)
                console.error("Failed to resolve dependency", error)
                toast.error(`Failed to resolve dependency: ${error.message}`)
                return false
            }
            return true
        }),

        update: withAsyncCommit(applyUpdate),

        updateAll: withAsyncCommit(async () => {
            const updates = Object.values(sdk.state.dependencyUpdates)
            const results = await Promise.all(updates.map(applyUpdate))
            return results.every(Boolean)
        }),
    } satisfies DependencyActions

    return actions
}   

export type DependencyActions = {
    registerDependency: (dependency: Workflow.Dependency) => void
    load: (dependencyId: Workflow.Id) => Promise<boolean>
    checkUpdates: () => Promise<void>
    attachWorkflowToNode: (nodeId: Workflow.Node.Id, fieldId: Field.Id, workflowId: Workflow.Id) => Promise<boolean>
    update: (updateInfo: Workflow.Dependency.UpdateInfo) => Promise<boolean>
    updateAll: () => Promise<boolean>
}

export function createBlueprintFromDependency(dependency: Workflow.Dependency, keepDependencySelector = false): Foundations.Blueprint {
    const base = ShelfSDK.state.blueprints["Core.SubWorkflow.Execute" as Foundations.Blueprint.Id]
    const dependencyFields = dependency.workflow_data.fields ?? []
    const baseFields = keepDependencySelector
        ? base.fields
        : base.fields.filter(f => f.variant !== "DependencySelector")

    return {
        ...base,
        ...extractExposedPorts(dependency.workflow_data),
        fields: mergeFieldsById(baseFields, dependencyFields),
        displayName: dependency.display_name,
        icon: dependency.icon ?? base.icon,
        accent: dependency.accent ?? base.accent,
    } satisfies Foundations.Blueprint
}

function mergeFieldsById(
    baseFields: readonly Foundations.Field[],
    dependencyFields: readonly Foundations.Field[],
): Foundations.Field[] {
    const fieldsById = new Map<Foundations.Field.Id, Foundations.Field>()

    for (const field of baseFields)
        fieldsById.set(field.id, field)

    for (const field of dependencyFields)
        if (!fieldsById.has(field.id))
            fieldsById.set(field.id, field)

    return [...fieldsById.values()]
}
