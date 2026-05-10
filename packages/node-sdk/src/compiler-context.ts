import { Workflow } from "@pretzel-graph/shared/domain";

export interface CompilationContext {
    compilePath: readonly Workflow.Id[];
}

export function createCompilationContext(rootId: Workflow.Id): CompilationContext {
    return { compilePath: [rootId] };
}

export function extendCompilePath(
    ctx: CompilationContext,
    nextId: Workflow.Id,
): CompilationContext {
    return {
        compilePath: [...ctx.compilePath, nextId],
    };
}
