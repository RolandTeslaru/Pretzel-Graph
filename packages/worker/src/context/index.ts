import { ExecutionSession, Orchestrator, Workflow } from "@vx-agent-editor/shared/domain"
import { StreamController } from "./stream-controller";
import { Emitter } from "src/event/emitter";
import { produce } from "immer";

export interface ExecutionContext {
    jobId: Orchestrator.Job.Id,
    session: ExecutionSession,
    workflowId: Workflow.Id,
    workflowData: Readonly<Workflow.Data>,
    workflowCache: Readonly<Workflow.Cache>,
    subWorkflows: Record<Workflow.Node.Id, Readonly<Workflow.Data>>,
    streamController: StreamController,
    abortController: AbortController,
    abortSignal: AbortSignal,
    abortWorkflow: (reason?: any) => void,
    emit: Emitter,
    updateSession: (recipe: (draft: ExecutionSession) => void) => void,
}

export function createExecutionContext(
    props: Omit<ExecutionContext, "updateSession" | "abortSignal" | "abortWorkflow">
): ExecutionContext {
    const ctx: ExecutionContext = {
        ...props,
        abortSignal: props.abortController.signal,
        abortWorkflow: (reason) => props.abortController.abort(reason),
        updateSession: (recipe) => {
            ctx.session = produce(ctx.session, recipe);
        },
    };
    return ctx;
}
