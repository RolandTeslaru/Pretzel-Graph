import { CompiledStateGraph, MessagesValue, ReducedValue, StateSchema, UntrackedValue } from "@langchain/langgraph";
import { RuntimeSnapshot } from "@vx-agent-editor/shared/domain";
import { StreamController } from "src/StreamController";

export namespace RuntimeState {
    export const Schema = new StateSchema({
        node_outputs: new ReducedValue(
            RuntimeSnapshot.Schema.shape.node_outputs,
            {
                reducer: (x, y) => ({ ...x, ...y }),
            }
        ),
        messages: MessagesValue,
        attachments: new ReducedValue(
            RuntimeSnapshot.Schema.shape.attachments,
            {
                reducer: (x, y) => ({ ...x, ...y }),
            }
        ),
        metadata: new ReducedValue(
            RuntimeSnapshot.Schema.shape.metadata,
            {
                reducer: (x, y) => ({ ...x, ...y }),
            }
        ),
        node_messages: new ReducedValue(
            RuntimeSnapshot.Schema.shape.node_messages,
            {
                reducer: (x, y) => ({ ...x, ...y }),
            }
        ),
        streamController: new UntrackedValue<StreamController>()
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