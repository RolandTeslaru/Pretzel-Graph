import { Workflow } from "@pretzel-graph/shared/domain";

export type WorkflowCompilationUnit = Pick<Workflow, "id" | "data">;

export interface CompilationContext {
    workflowsMap: Map<Workflow.Id, WorkflowCompilationUnit>;
    compilePath: readonly Workflow.Id[];
}

export function createCompilationContext(rootId: Workflow.Id): CompilationContext {
    return { workflowsMap: new Map(), compilePath: [rootId] };
}

export function extendCompilePath(
    ctx: CompilationContext,
    nextId: Workflow.Id,
): CompilationContext {
    return {
        workflowsMap: ctx.workflowsMap,
        compilePath: [...ctx.compilePath, nextId],
    };
}
