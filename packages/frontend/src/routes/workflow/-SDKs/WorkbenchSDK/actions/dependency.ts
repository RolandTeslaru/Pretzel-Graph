import { SystemError, Workbench, type Workflow } from "@pretzel-graph/shared/domain"
import type { VersionControlPublication } from "@pretzel-graph/shared/domain/VersionControlPublication"
import type { WorkbenchSDKImpl } from "../sdk"
import { withCommit, withAsyncCommit, withCyclesRecompute } from "../utils/actions"
import { api } from "@/SDKs/ApiInterceptorSDK"
import { toast } from "sonner"

export function createDependencyActions(sdk: WorkbenchSDKImpl) {
    const setState = sdk.useStore.setState
    const reducers = sdk.reducers

    const applyUpdate = async (mode: "publication" | "draft", workflowId: Workflow.Id): Promise<boolean> => {
        try {
            const { dependency } = mode === "publication"
                ? await Workbench.API.Dependency.Published.load(api, { dependencyId: workflowId })
                : await Workbench.API.Dependency.Draft.load(api, { dependencyId: workflowId })

            setState(withCyclesRecompute(s => {
                reducers.dependency.applyUpdate(s, mode, dependency)
            }))
        } catch (err) {
            const error = SystemError.fromUnknown(err)
            console.error("Failed to apply dependency update", error)
            toast.error(`Failed to apply dependency update: ${error.message}`)
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

        attachToNode: withAsyncCommit(async (nodeId, workflowId, mode) => {
            const promise: Promise<{ dependency: Workflow.Dependency }> =
                mode === "publication"
                    ? Workbench.API.Dependency.Published.load(api, { dependencyId: workflowId })
                    : Workbench.API.Dependency.Draft.load(api, { dependencyId: workflowId })

            toast.promise(promise, {
                loading: "Loading workflow…",
                success: "Workflow attached",
                error:   (err) => `Failed to attach dependency: ${SystemError.fromUnknown(err).message}`,
            })

            try {
                const { dependency } = await promise

                setState(withCyclesRecompute(s => {
                    reducers.dependency.attachToNode(s, nodeId, workflowId, mode, dependency)
                }))
            } catch (err) {
                console.error("Failed to attach dependency", err)
                return false
            }
            return true
        }),
        published: {
            update: withAsyncCommit((updateInfo) => applyUpdate("publication", updateInfo.workflowId)),
        },

        draft: {
            update: withAsyncCommit((updateInfo) => applyUpdate("draft", updateInfo.workflowId)),
        },

        updateAll: withAsyncCommit(async () => {
            const publishedUpdates = Object.values(sdk.state.dependencyUpdates.published)
            const draftUpdates     = Object.values(sdk.state.dependencyUpdates.draft)
            const results = await Promise.all([
                ...publishedUpdates.map(u => applyUpdate("publication", u.workflowId)),
                ...draftUpdates.map(u => applyUpdate("draft", u.workflowId)),
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
    attachToNode:       (nodeId: Workflow.Node.Id, workflowId: Workflow.Id, mode: "publication" | "draft") => Promise<boolean>
    published: {
        update: (updateInfo: Workflow.Dependency.Publication.UpdateInfo) => Promise<boolean>
    }
    draft: {
        update: (updateInfo: Workflow.Dependency.Draft.UpdateInfo) => Promise<boolean>
    }
}
