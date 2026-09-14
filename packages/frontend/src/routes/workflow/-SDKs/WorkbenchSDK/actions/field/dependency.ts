import type { Dependency } from "@pretzel-graph/shared/domain";
import type { WorkbenchSDKImpl } from "../../sdk";
import { withAsyncCommit, withCyclesRecompute, createToastPromise } from "../../utils/actions";
import { SystemError, Workbench, type Foundations, type Workflow } from "@pretzel-graph/shared/domain";
import { api } from "@/SDKs/ApiInterceptorSDK";

// Fetches the snapshot a ref points at from its source.
export function loadDependency(ref: Dependency.Ref) {
    switch (ref.kind) {
        case "draftWorkflow":
            return Workbench.API.Dependency.Draft.load(api, { dependencyId: ref.id })

        case "publishedWorkflow":
        case "listing":
            return Workbench.API.Dependency.Published.load(api, { dependencyId: ref.id })
    }
}

export function createFieldDependencyActions(sdk: WorkbenchSDKImpl) {
    const setDocument = sdk.setDocument;
    const reducers    = sdk.reducers;
    const sel         = sdk.selectors;

    return {
        // Points the field at a dependency, reusing the embedded snapshot or fetching it.
        setValue: withAsyncCommit(async (nodeId, fieldId, ref) => {
            const existing = sel.dependency.getWorkflow(sdk.document, ref.id, ref.kind)

            if (existing) {
                setDocument(withCyclesRecompute(d => {
                    reducers.field.dependency.setValue(d, nodeId, fieldId, ref, existing)
                }))
                return true
            }

            const promise = createToastPromise<{ dependency: Dependency }>(
                loadDependency(ref),
                {
                    loading: "Loading workflow…",
                    success: "Workflow attached",
                    error:   (err: unknown) => `Failed to attach dependency: ${SystemError.fromUnknown(err).message}`,
                }
            )

            try {
                const { dependency } = await promise

                setDocument(withCyclesRecompute(d => {
                    reducers.field.dependency.setValue(d, nodeId, fieldId, ref, dependency)
                }))
            } catch (err) {
                console.error("Failed to attach dependency", err)
                return false
            }

            return true
        }),
    } satisfies FieldDependencyActions;
}

export interface FieldDependencyActions {
    setValue: (nodeId: Workflow.Node.Id, fieldId: Foundations.Field.Id, ref: Dependency.Ref) => Promise<boolean>
}
