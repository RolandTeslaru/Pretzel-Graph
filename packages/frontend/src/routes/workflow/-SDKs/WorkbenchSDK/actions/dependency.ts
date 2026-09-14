import { SystemError, Workbench, type Dependency, type Workflow } from "@pretzel-graph/shared/domain"
import type { WorkbenchSDKImpl } from "../sdk"
import { withCommit, withAsyncCommit, withCyclesRecompute, createToastPromise } from "../utils/actions"
import { api } from "@/SDKs/ApiInterceptorSDK"
import { toast } from "sonner"

// Fetches a resource's current state, shaped as the snapshot a dependency embeds.
export function loadResource(ref: Dependency.Ref): Promise<{ dependency: Dependency.Value }> {
    switch (ref.kind) {
        case "draftWorkflow":
            return Workbench.API.Dependency.Draft.load(api, { dependencyId: ref.id })

        case "publishedWorkflow":
        case "listing":
            return Workbench.API.Dependency.Published.load(api, { dependencyId: ref.id })
    }
}

export function createDependencyActions(sdk: WorkbenchSDKImpl) {
    const setDocument = sdk.setDocument
    const reducers = sdk.reducers

    const applyUpdate = async (update: Dependency.Update): Promise<boolean> => {
        const promise = createToastPromise<{ dependency: Dependency.Value }>(
            loadResource(update),
            {
                loading: "Updating dependency…",
                success: "Dependency updated",
                error:   (err: unknown) => `Failed to update dependency: ${SystemError.fromUnknown(err).message}`,
            }
        )

        try {
            const { dependency } = await promise

            setDocument(withCyclesRecompute(d => {
                reducers.dependency.applyUpdate(d, update, dependency)
            }))
        } catch (err) {
            console.error("Failed to apply dependency update", err)
            return false
        }
        return true
    }

    const actions = {
        registerDependency: withCommit((ref, value) => {
            setDocument(d => {
                reducers.dependency.register(d, ref, value)
            })
        }),
        checkUpdates: async () => {
            const values = Object.values(sdk.document.data.dependencies)

            const publishedEntries = values.flatMap(value => value.kind === "draftWorkflow" ? [] : [{
                workflowId:    value.workflow_id,
                publicationId: value.id,
            }])

            const draftEntries = values.flatMap(value => value.kind === "draftWorkflow" ? [{
                workflowId: value.id,
                updated_at: value.updated_at,
            }] : [])

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
    registerDependency: (ref: Dependency.Ref, value: Dependency.Value) => void
    checkUpdates:       () => Promise<void>
    update:             (update: Dependency.Update) => Promise<boolean>
    updateAll:          () => Promise<boolean>
}
