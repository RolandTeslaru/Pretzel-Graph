import type { WorkbenchSDK } from "../sdk";
import type { Workflow } from "@pretzel-graph/shared/domain";

type S = WorkbenchSDK.State

export const workflowSelectors = {
    // workflowId is only ever set by reducers.workflow.open — after the fetch, parse and
    // blueprint hydration — and cleared by close. Truthy means the graph is fully loaded.
    isLoaded: (s: S): boolean => Boolean(s.workflowId),

    isActive: (s: S, workflowId: Workflow.Id): boolean => s.workflowId === workflowId,
} satisfies WorkflowSelectors


export interface WorkflowSelectors {
    /** True once a workflow is open in the workbench. */
    isLoaded: (s: S) => boolean

    /** True when the given workflow is the one currently open. */
    isActive: (s: S, workflowId: Workflow.Id) => boolean
}
