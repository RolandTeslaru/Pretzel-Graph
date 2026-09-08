import type { Document } from "../index";
import type { Workflow } from "../../../Workflow";


export const workflowSelectors: WorkflowSelectors = {
    // workflowId is only ever set by reducers.workflow.open — after the fetch, parse and
    // blueprint hydration — and cleared by close. Truthy means the graph is fully loaded.
    isLoaded: (d: Document): boolean => Boolean(d.workflowId),

    isActive: (d: Document, workflowId: Workflow.Id): boolean => d.workflowId === workflowId,
}


export interface WorkflowSelectors {
    /** True once a workflow is open in the workbench. */
    isLoaded: (document: Document) => boolean

    /** True when the given workflow is the one currently open. */
    isActive: (document: Document, workflowId: Workflow.Id) => boolean
}
