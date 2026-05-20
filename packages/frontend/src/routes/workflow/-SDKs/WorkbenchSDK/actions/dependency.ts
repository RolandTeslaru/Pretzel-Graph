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

    const applyPublishedUpdate = async (updateInfo: Workflow.Dependency.Publication.UpdateInfo): Promise<boolean> => {
        try {
            const { dependency } = await Workbench.API.Dependency.Published.load(api, { dependencyId: updateInfo.workflowId })

            setState(withCyclesRecompute(s => {
                reducers.dependency.published.register(s, dependency)

                const affectedNodeIds = Object.values(s.data.nodes)
                    .filter(n => n.workflowDependencyId === updateInfo.workflowId)
                    .map(n => n.id)

                for (const affectedNodeId of affectedNodeIds) {
                    const keepSelector = !!(s.data.staticValues[affectedNodeId]?.["workflowId" as Field.Id])
                    const subflowBlueprint = createBlueprintFromDependency(dependency, keepSelector)
                    reducers.node.recreate(s, affectedNodeId, subflowBlueprint)
                    reducers.node.validate(s, affectedNodeId)
                }

                delete s.dependencyUpdates.published[updateInfo.workflowId]
            }))
        } catch (err) {
            const error = SystemError.fromUnknown(err)
            console.error("Failed to update dependency", error)
            toast.error(`Failed to update dependency: ${error.message}`)
            return false
        }
        return true
    }

    const applyDraftUpdate = async (updateInfo: Workflow.Dependency.Draft.UpdateInfo): Promise<boolean> => {
        try {
            const { dependency } = await Workbench.API.Dependency.Draft.load(api, { dependencyId: updateInfo.workflowId })

            setState(withCyclesRecompute(s => {
                reducers.dependency.draft.register(s, dependency)

                const affectedNodeIds = Object.values(s.data.nodes)
                    .filter(n => n.workflowDependencyId === updateInfo.workflowId)
                    .map(n => n.id)

                for (const affectedNodeId of affectedNodeIds) {
                    const keepSelector = !!(s.data.staticValues[affectedNodeId]?.["workflowId" as Field.Id])
                    const subflowBlueprint = createBlueprintFromDependency(dependency, keepSelector)
                    reducers.node.recreate(s, affectedNodeId, subflowBlueprint)
                    reducers.node.validate(s, affectedNodeId)
                }

                delete s.dependencyUpdates.draft[updateInfo.workflowId]
            }))
        } catch (err) {
            const error = SystemError.fromUnknown(err)
            console.error("Failed to update draft dependency", error)
            toast.error(`Failed to update draft dependency: ${error.message}`)
            return false
        }
        return true
    }

    const actions = {
        registerDependency: withCommit((dependency) => {
            setState(s => {
                s.data.dependencies.published[dependency.workflow_id] = dependency
            })
        }),
        checkUpdates: async () => {
            const dependencies      = sdk.state.data.dependencies.published
            const draftDependencies = sdk.state.data.dependencies.draft

            const publishedEntries = Object.values(dependencies).map(dep => ({
                workflowId:    dep.workflow_id as Workflow.Id,
                publicationId: dep.id as VersionControlPublication.Id,
            }))

            const draftEntries = Object.values(draftDependencies).map(dep => ({
                workflowId:          dep.workflow_id as Workflow.Id,
                workflow_updated_at: dep.workflow_updated_at,
            }))

            const [publishedResult, draftResult] = await Promise.allSettled([
                publishedEntries.length > 0
                    ? Workbench.API.Dependency.Published.checkUpdates(api, { dependencies: publishedEntries })
                    : Promise.resolve({ updates: {} as Record<Workflow.Id, Workflow.Dependency.Publication.UpdateInfo> }),
                draftEntries.length > 0
                    ? Workbench.API.Dependency.Draft.checkUpdates(api, { dependencies: draftEntries })
                    : Promise.resolve({ updates: {} as Record<Workflow.Id, Workflow.Dependency.Draft.UpdateInfo> }),
            ])

            setState(s => {
                if (publishedResult.status === 'fulfilled') s.dependencyUpdates.published = publishedResult.value.updates
                if (draftResult.status    === 'fulfilled') s.dependencyUpdates.draft    = draftResult.value.updates
            })

            const count =
                (publishedResult.status === 'fulfilled' ? Object.keys(publishedResult.value.updates).length : 0) +
                (draftResult.status    === 'fulfilled' ? Object.keys(draftResult.value.updates).length    : 0)

            if (count > 0)
                toast.info(`${count} dependency update${count === 1 ? '' : 's'} available`)
        },

        published: {
            attachToNode: withAsyncCommit(async (nodeId: Workflow.Node.Id, fieldId: Field.Id, workflowId: Workflow.Id) => {
                try {
                    const { dependency } = await Workbench.API.Dependency.Published.load(api, { dependencyId: workflowId })
                    const subflowBlueprint = createBlueprintFromDependency(dependency, true)
                    const dependencyFields = dependency.workflow_data.fields ?? []

                    setState(withCyclesRecompute(s => {
                        reducers.dependency.published.register(s, dependency)
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
                    console.error("Failed to resolve published dependency", error)
                    toast.error(`Failed to resolve dependency: ${error.message}`)
                    return false
                }
                return true
            }),
            update:    withAsyncCommit(applyPublishedUpdate),
        },

        draft: {
            attachToNode: withAsyncCommit(async (nodeId: Workflow.Node.Id, fieldId: Field.Id, workflowId: Workflow.Id) => {
                try {
                    const { dependency } = await Workbench.API.Dependency.Draft.load(api, { dependencyId: workflowId })
                    const subflowBlueprint = createBlueprintFromDependency(dependency, true)
                    const dependencyFields = dependency.workflow_data.fields ?? []

                    setState(withCyclesRecompute(s => {
                        reducers.dependency.draft.register(s, dependency)
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
                    console.error("Failed to resolve draft dependency", error)
                    toast.error(`Failed to resolve draft dependency: ${error.message}`)
                    return false
                }
                return true
            }),
            update: withAsyncCommit(applyDraftUpdate),
        },

        updateAll: withAsyncCommit(async () => {
            const publishedUpdates = Object.values(sdk.state.dependencyUpdates.published)
            const draftUpdates     = Object.values(sdk.state.dependencyUpdates.draft)
            const results = await Promise.all([
                ...publishedUpdates.map(applyPublishedUpdate),
                ...draftUpdates.map(applyDraftUpdate),
            ])
            return results.every(Boolean)
        }),
    } satisfies DependencyActions

    return actions
}

export type DependencyActions = {
    registerDependency: (dependency: Workflow.Dependency.Publication) => void
    checkUpdates:       () => Promise<void>
    updateAll:          () => Promise<boolean>
    published: {
        attachToNode: (nodeId: Workflow.Node.Id, fieldId: Field.Id, workflowId: Workflow.Id) => Promise<boolean>
        update:       (updateInfo: Workflow.Dependency.Publication.UpdateInfo) => Promise<boolean>
    }
    draft: {
        attachToNode: (nodeId: Workflow.Node.Id, fieldId: Field.Id, workflowId: Workflow.Id) => Promise<boolean>
        update:       (updateInfo: Workflow.Dependency.Draft.UpdateInfo) => Promise<boolean>
    }
}

type DependencyLike = {
    workflow_data: Workflow.Data
    display_name: string
    icon?: string | null
    accent?: string | null
}

export function createBlueprintFromDependency(dependency: DependencyLike, keepDependencySelector = false): Foundations.Blueprint {
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
