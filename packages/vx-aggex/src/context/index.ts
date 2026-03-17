import { ExecutionSession, Orchestrator, Workflow } from "@vx-agent-editor/shared/domain"
import { StreamController } from "./stream-controller";
import { Emitter } from "src/event/emitter";
import { produce } from "immer";

export interface ExecutionContext {
    jobId: Orchestrator.Job.Id,
    session: ExecutionSession,
    workflow: Readonly<Workflow>,
    workflowCache: Readonly<Workflow.Cache>,
    streamController: StreamController,
    abortController: AbortController
    emit: Emitter,
    updateSession: (recipe: (draft: ExecutionSession) => void) => void,
}

export function createExecutionContext(
    props: Omit<ExecutionContext, "updateSession">
): ExecutionContext {
    const ctx: ExecutionContext = {
        ...props,
        abortController: new AbortController(),
        updateSession: (recipe) => {
            ctx.session = produce(ctx.session, recipe);
        },
    };
    return ctx;
}
