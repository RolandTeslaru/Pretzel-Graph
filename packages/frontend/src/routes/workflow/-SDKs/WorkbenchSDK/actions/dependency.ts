import { SystemError, Workbench, type Workflow } from "@pretzel-graph/shared/domain"
import type { WorkbenchSDKImpl } from "../sdk"
import { withCommit, withAsyncCommit, withCyclesRecompute, createToastPromise } from "../utils/actions"
import { api } from "@/SDKs/ApiInterceptorSDK"
import { toast } from "sonner"

export function createDependencyActions(sdk: WorkbenchSDKImpl) {
    const setDocument = sdk.setDocument
    const reducers = sdk.reducers

    const applyUpdate = async (mode: "publication" | "draft", workflowId: Workflow.Id): Promise<boolean> => {
        const promise = createToastPromise<{ dependency: Workflow.Dependency }>(
            mode === "publication"
                ? Workbench.API.Dependency.Published.load(api, { dependencyId: workflowId })
                : Workbench.API.Dependency.Draft.load(api, { dependencyId: workflowId }),
            {
                loading: "Updating dependency…",
                success: "Dependency updated",
                error:   (err: unknown) => `Failed to update dependency: ${SystemError.fromUnknown(err).message}`,
            }
        )

        try {
            const { dependency } = await promise

            setDocument(withCyclesRecompute(d => {
                reducers.dependency.applyUpdate(d, mode, dependency)
            }))
        } catch (err) {
            console.error("Failed to apply dependency update", err)
            return false
        }
        return true
    }

    const actions = {
        registerDependency: withCommit((dependency) => {
            setDocument(d => {
                d.data.dependencies.published[dependency.workflow_id] = dependency
            })
        }),
        checkUpdates: async () => {
            const dependencies      = sdk.document.data.dependencies.published
            const draftDependencies = sdk.document.data.dependencies.draft

            const publishedEntries = Object.values(dependencies).map(dep => ({
                workflowId:    dep.workflow_id as Workflow.Id,
                publicationId: dep.id,
            }))

            const draftEntries = Object.values(draftDependencies).map(dep => ({
                workflowId:          dep.workflow_id as Workflow.Id,
                workflow_updated_at: dep.workflow_updated_at,
            }))

            const [publishedResult, draftResult] = await Promise.allSettled([
                publishedEntries.length > 0
                    ? Workbench.API.Dependency.Published.checkUpdates(api, { dependencies: publishedEntries })
                    : Promise.resolve({ updates: {} as Workflow.Dependency.Publication.UpdateMap }),
                draftEntries.length > 0
                    ? Workbench.API.Dependency.Draft.checkUpdates(api, { dependencies: draftEntries })
                    : Promise.resolve({ updates: {} as Record<Workflow.Id, Workflow.Dependency.Draft.UpdateInfo> }),
            ])

            setDocument(d => {
                if (publishedResult.status === 'fulfilled') d.dependencyUpdates.published = publishedResult.value.updates
                if (draftResult.status    === 'fulfilled') d.dependencyUpdates.draft    = draftResult.value.updates
            })

            const count =
                (publishedResult.status === 'fulfilled' ? Object.keys(publishedResult.value.updates).length : 0) +
                (draftResult.status    === 'fulfilled' ? Object.keys(draftResult.value.updates).length    : 0)

            if (count > 0)
                toast.info(`${count} dependency update${count === 1 ? '' : 's'} available`)
        },

        published: {
            update: withAsyncCommit((updateInfo) => applyUpdate("publication", updateInfo.workflowId)),
        },

        draft: {
            update: withAsyncCommit((updateInfo) => applyUpdate("draft", updateInfo.workflowId)),
        },

        updateAll: withAsyncCommit(async () => {
            const publishedUpdates = Object.values(sdk.document.dependencyUpdates.published)
            const draftUpdates     = Object.values(sdk.document.dependencyUpdates.draft)
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
    published: {
        update: (updateInfo: Workflow.Dependency.Publication.UpdateInfo) => Promise<boolean>
    }
    draft: {
        update: (updateInfo: Workflow.Dependency.Draft.UpdateInfo) => Promise<boolean>
    }
}
