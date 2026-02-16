import { CompiledStateGraph, MessagesValue, ReducedValue, StateSchema } from "@langchain/langgraph";
import { Foundations, Orchestrator } from "@vx-agent-editor/shared/domain";
import { Workflow } from "@vx-agent-editor/shared/domain";
import { EventBuilder } from "./eventBuilder";
import { LC } from "./langchain";
import { InferFields, InferInputs, InferOutputs } from "./types";


export namespace Runtime {

    export type Emitter = (
        callbackFn: (eventBuilder: EventBuilder) => Orchestrator.Event
    ) => void

    export namespace State {
        export const Schema = new StateSchema({
            node_outputs: new ReducedValue(
                Orchestrator.RuntimeState.Schema.shape.node_outputs,
                {
                    reducer: (x, y) => ({ ...x, ...y }),
                }
            ),
            messages: MessagesValue,
            artifacts: new ReducedValue(
                Orchestrator.RuntimeState.Schema.shape.artifacts,
                {
                    reducer: (x, y) => ({ ...x, ...y }),
                }
            ),
            metadata: new ReducedValue(
                Orchestrator.RuntimeState.Schema.shape.metadata,
                {
                    reducer: (x, y) => ({ ...x, ...y }),
                }
            ),
        });
        export const Update = State.Schema.Update
        export type Update = typeof Update
    }
    export type State = typeof State.Schema.State

    export type CompiledGraph = CompiledStateGraph<
        State,
        typeof State.Schema.Update,
        string,
        typeof State.Schema,
        typeof State.Schema
    >

    export type NodeRunner = (
        state: Runtime.State,
        activeNode: Workflow.Node,
        Vertex: Runtime.Node<Foundations.Blueprint>,
        workflow: Workflow,
        emit: Runtime.Emitter
    ) => Promise<State.Update>


    export abstract class Node<T_Blueprint extends Foundations.Blueprint> {

        public workflowNode: Workflow.Node;

        constructor(workflowNode: Workflow.Node) {
            this.workflowNode = workflowNode;
        }

        /**
         * Execute this node.
         * 
         * @param globalState - The full LangGraph runtime state
         * @param config - Static configuration values (NodeConfig fields like temperature, model, etc.)
         * @param inputs - Port inputs resolved from upstream edges or fallback values
         */
        public abstract run(
            globalState: Runtime.State,
            fields: InferFields<T_Blueprint>,
            inputs: InferInputs<T_Blueprint>
        ): Promise<InferOutputs<T_Blueprint>>;

        public static onReconcile(
            changedFieldId: Foundations.Field.Id,
            newValue: Foundations.Field.Value,
        ): Foundations.Blueprint {
            throw new Error("Method 'onReconcile' must be implemented.");
        }

        protected async onConversion(
            currentBlueprint: T_Blueprint
        ): Promise<T_Blueprint> {
            return currentBlueprint
        }
    }



}
