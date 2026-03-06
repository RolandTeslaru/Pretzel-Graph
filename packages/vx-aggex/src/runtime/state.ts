import { CompiledStateGraph, MessagesValue, ReducedValue, StateSchema, UntrackedValue } from "@langchain/langgraph";
import { Chat, ExecutionSession, Orchestrator, Workflow } from "@vx-agent-editor/shared/domain";
import { Emitter } from "src/event/emitter";
import { StreamController } from "src/StreamController";

export namespace RuntimeState {
    export const Schema = new StateSchema({
        node_outputs: new ReducedValue(
            ExecutionSession.Schema.shape.node_outputs,
            {
                reducer: (x, y) => ({ ...x, ...y }),
            }
        ),
        messages: MessagesValue,
        attachments: new ReducedValue(
            ExecutionSession.Schema.shape.attachments,
            {
                reducer: (x, y) => ({ ...x, ...y }),
            }
        ),
        metadata: new ReducedValue(
            ExecutionSession.Schema.shape.metadata,
            {
                reducer: (x, y) => ({ ...x, ...y }),
            }
        ),
        chatId: Chat.Id,
        streamController: new UntrackedValue<StreamController>(),
        emit: new UntrackedValue<Emitter>(),
        jobId: new UntrackedValue<Orchestrator.Job.Id>(),
        workflowCache: new UntrackedValue<Workflow.Cache>(),
        // TODO: fix typing here
        workflow: new UntrackedValue<any>(),
    });
    export const Update = RuntimeState.Schema.Update
    export type Update = typeof Update
}
export type RuntimeState = typeof RuntimeState.Schema.State



export interface RuntimeCompiledGraph extends CompiledStateGraph<
    RuntimeState,
    typeof RuntimeState.Schema.Update,
    string,
    typeof RuntimeState.Schema,
    typeof RuntimeState.Schema
> {};