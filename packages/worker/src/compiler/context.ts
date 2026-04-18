import { Workflow } from "@vx-agent-editor/shared/domain";

export interface CompilationContext {
    workflowCache: Map<Workflow.Id, Workflow>;
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
