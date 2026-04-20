import { Workflow } from "@vx-agent-editor/shared/domain";

export type WorkflowCompilationUnit = Pick<Workflow, "id" | "data">;

export interface CompilationContext {
    workflowCache: Map<Workflow.Id, WorkflowCompilationUnit>;
    compilePath: readonly Workflow.Id[];
}

export function createCompilationContext(rootId: Workflow.Id): CompilationContext {
    return { workflowCache: new Map(), compilePath: [rootId] };
}

export function extendCompilePath(
    ctx: CompilationContext,
    nextId: Workflow.Id,
): CompilationContext {
    return {
        workflowCache: ctx.workflowCache,
        compilePath: [...ctx.compilePath, nextId],
    };
}
