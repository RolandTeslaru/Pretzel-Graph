import type { Dependency } from "@pretzel-graph/shared/domain";
import type { WorkbenchSDKImpl } from "../../sdk";
import { withAsyncCommit, withCyclesRecompute, createToastPromise } from "../../utils/actions";
import { SystemError, Workbench, type Foundations, type Workflow } from "@pretzel-graph/shared/domain";
import { api } from "@/SDKs/ApiInterceptorSDK";

export function createWorkflowDependencyActions(sdk: WorkbenchSDKImpl) {
    const setDocument = sdk.setDocument;
    const reducers    = sdk.reducers;
    const sel         = sdk.selectors;

    return {
        select: withAsyncCommit(async (nodeId, fieldId, workflowId, kind) => {
            // Reuse the snapshot when the workflow already embeds this dependency.
            const existing = sel.dependency.getWorkflow(sdk.document, workflowId, kind)

            if (existing) {
                setDocument(withCyclesRecompute(d => {
                    reducers.field.workflowDependency.set(d, nodeId, fieldId, kind, existing)
                }))
                return true
            }

            const promise = createToastPromise<{ dependency: Dependency }>(
                kind === "draftWorkflow"
                    ? Workbench.API.Dependency.Draft.load(api, { dependencyId: workflowId })
                    : Workbench.API.Dependency.Published.load(api, { dependencyId: workflowId }),
                {
                    loading: "Loading workflow…",
                    success: "Workflow attached",
                    error:   (err: unknown) => `Failed to attach dependency: ${SystemError.fromUnknown(err).message}`,
                }
            )

            try {
                const { dependency } = await promise

                setDocument(withCyclesRecompute(d => {
                    reducers.field.workflowDependency.set(d, nodeId, fieldId, kind, dependency)
                }))
            } catch (err) {
                console.error("Failed to attach dependency", err)
                return false
            }

            return true
        }),
    } satisfies WorkflowDependencyActions;
}

export interface WorkflowDependencyActions {
    select: (nodeId: Workflow.Node.Id, fieldId: Foundations.Field.Id, workflowId: Workflow.Id, kind: Dependency.Ref.Workflow["kind"]) => Promise<boolean>
}
