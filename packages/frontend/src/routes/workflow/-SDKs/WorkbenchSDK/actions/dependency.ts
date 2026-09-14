import { SystemError, Workbench, type Dependency, type Workflow } from "@pretzel-graph/shared/domain"
import type { WorkbenchSDKImpl } from "../sdk"
import { withCommit, withAsyncCommit, withCyclesRecompute, createToastPromise } from "../utils/actions"
import { api } from "@/SDKs/ApiInterceptorSDK"
import { toast } from "sonner"
import { loadDependency } from "./field/dependency"

export function createDependencyActions(sdk: WorkbenchSDKImpl) {
    const setDocument = sdk.setDocument
    const reducers = sdk.reducers

    const applyUpdate = async (update: Dependency.Update): Promise<boolean> => {
        const promise = createToastPromise<{ dependency: Dependency }>(
            loadDependency(update),
            {
                loading: "Updating dependency…",
                success: "Dependency updated",
                error:   (err: unknown) => `Failed to update dependency: ${SystemError.fromUnknown(err).message}`,
            }
        )

        try {
            const { dependency } = await promise

            setDocument(withCyclesRecompute(d => {
                reducers.dependency.applyUpdate(d, update.kind, dependency)
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
                d.data.dependencies.publishedWorkflow[dependency.workflow_id] = dependency
            })
        }),
        checkUpdates: async () => {
            const publishedWorkflows = sdk.document.data.dependencies.publishedWorkflow
            const draftWorkflows     = sdk.document.data.dependencies.draftWorkflow

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
                if (publishedResult.status === 'fulfilled') d.dependencyUpdates.publishedWorkflow = publishedResult.value.updates
                if (draftResult.status    === 'fulfilled') d.dependencyUpdates.draftWorkflow     = draftResult.value.updates
            })

            const count =
                (publishedResult.status === 'fulfilled' ? Object.keys(publishedResult.value.updates).length : 0) +
                (draftResult.status    === 'fulfilled' ? Object.keys(draftResult.value.updates).length    : 0)

            if (count > 0)
                toast.info(`${count} dependency update${count === 1 ? '' : 's'} available`)
        },

        update: withAsyncCommit((update) => applyUpdate(update)),

        updateAll: withAsyncCommit(async () => {
            const updates = [
                ...Object.values(sdk.document.dependencyUpdates.publishedWorkflow),
                ...Object.values(sdk.document.dependencyUpdates.draftWorkflow),
            ]
            const results = await Promise.all(updates.map(applyUpdate))
            return results.every(Boolean)
        }),
    } satisfies DependencyActions

    return actions
}

export type DependencyActions = {
    registerDependency: (dependency: Dependency.Value.Publication) => void
    checkUpdates:       () => Promise<void>
    update:             (update: Dependency.Update) => Promise<boolean>
    updateAll:          () => Promise<boolean>
}
