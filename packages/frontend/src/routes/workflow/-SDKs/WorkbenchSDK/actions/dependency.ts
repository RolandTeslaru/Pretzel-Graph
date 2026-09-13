import { SystemError, Workbench, type Dependency, type Workflow } from "@pretzel-graph/shared/domain"
import type { WorkbenchSDKImpl } from "../sdk"
import { withCommit, withAsyncCommit, withCyclesRecompute, createToastPromise } from "../utils/actions"
import { api } from "@/SDKs/ApiInterceptorSDK"
import { toast } from "sonner"

export function createDependencyActions(sdk: WorkbenchSDKImpl) {
    const setDocument = sdk.setDocument
    const reducers = sdk.reducers

    const applyUpdate = async (mode: "publication" | "draft", workflowId: Workflow.Id): Promise<boolean> => {
        const promise = createToastPromise<{ dependency: Dependency }>(
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
                d.data.dependencies.publishedWorkflows[dependency.workflow_id] = dependency
            })
        }),
        checkUpdates: async () => {
            const publishedWorkflows = sdk.document.data.dependencies.publishedWorkflows
            const draftWorkflows     = sdk.document.data.dependencies.draftWorkflows

            const publishedEntries = Object.values(publishedWorkflows).map(dep => ({
                workflowId:    dep.workflow_id as Workflow.Id,
                publicationId: dep.id,
            }))

            const draftEntries = Object.values(draftWorkflows).map(dep => ({
                workflowId: dep.id,
                updated_at: dep.updated_at,
            }))

            const [publishedResult, draftResult] = await Promise.allSettled([
                publishedEntries.length > 0
                    ? Workbench.API.Dependency.Published.checkUpdates(api, { dependencies: publishedEntries })
                    : Promise.resolve({ updates: {} as Dependency.Update.PublicationMap }),
                draftEntries.length > 0
                    ? Workbench.API.Dependency.Draft.checkUpdates(api, { dependencies: draftEntries })
                    : Promise.resolve({ updates: {} as Record<Workflow.Id, Dependency.Update.Draft> }),
            ])

            setDocument(d => {
                if (publishedResult.status === 'fulfilled') d.dependencyUpdates.publishedWorkflows = publishedResult.value.updates
                if (draftResult.status    === 'fulfilled') d.dependencyUpdates.draftWorkflows     = draftResult.value.updates
            })

            const count =
                (publishedResult.status === 'fulfilled' ? Object.keys(publishedResult.value.updates).length : 0) +
                (draftResult.status    === 'fulfilled' ? Object.keys(draftResult.value.updates).length    : 0)

            if (count > 0)
                toast.info(`${count} dependency update${count === 1 ? '' : 's'} available`)
        },

        publishedWorkflows: {
            update: withAsyncCommit((updateInfo) => applyUpdate("publication", updateInfo.workflowId)),
        },

        draftWorkflows: {
            update: withAsyncCommit((updateInfo) => applyUpdate("draft", updateInfo.workflowId)),
        },

        updateAll: withAsyncCommit(async () => {
            const publishedUpdates = Object.values(sdk.document.dependencyUpdates.publishedWorkflows)
            const draftUpdates     = Object.values(sdk.document.dependencyUpdates.draftWorkflows)
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
    registerDependency: (dependency: Dependency.Value.Publication) => void
    checkUpdates:       () => Promise<void>
    updateAll:          () => Promise<boolean>
    publishedWorkflows: {
        update: (updateInfo: Dependency.Update.Publication) => Promise<boolean>
    }
    draftWorkflows: {
        update: (updateInfo: Dependency.Update.Draft) => Promise<boolean>
    }
}
