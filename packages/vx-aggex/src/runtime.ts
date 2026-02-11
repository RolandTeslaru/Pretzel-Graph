import { CompiledStateGraph, MessagesValue, ReducedValue, StateSchema } from "@langchain/langgraph";
import { Foundations, Orchestrator } from "@vx-agent-editor/shared/types";
import { Workflow } from "@vx-agent-editor/shared/types/Workflow";
import { EventBuilder } from "./eventBuilder";


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


    export abstract class Node<TBlueprint extends Foundations.Blueprint> {

        public workflowNode: Workflow.Node;

        public abstract Blueprint: TBlueprint;

        constructor(workflowNode: Workflow.Node) {
            this.workflowNode = workflowNode;
        }

        /**
         * Execute this node.
         * 
         * `inputs` is a single object containing ALL resolved values:
         * - Field inputs (string, number, boolean, etc.) come from workflow fieldValues.
         * - Port inputs (BaseMessage, BaseLanguageModel, etc.) come from upstream node outputs via edges.
         * 
         * The engine resolves and synthesizes these before calling run().
         */
        public abstract run(
            globalState: Runtime.State,
            inputs: InferInputs<TBlueprint>
        ): Promise<InferOutputs<TBlueprint>>;

        protected async onReconcile(
            changedInputId: Foundations.Input.Id,
            newValue: any,
            currentBlueprint: TBlueprint
        ): Promise<TBlueprint> {
            return Promise.resolve(currentBlueprint);
        }
    }


    /**
     * Infer runtime input values from a Blueprint.
     * 
     * Resolution order per input:
     * 1. __valueType phantom (set by port builders like InputBuilder.Message → BaseMessage)
     * 2. initialValue type (set by field builders like InputBuilder.Float → number)
     * 3. Fallback to `any`
     */
    export type InferInputs<D> = D extends { inputs: infer T }
        ? T extends readonly { id: string }[]
            ? { [K in T[number] as K extends { __literalId?: infer Id extends string }
                ? Id
                : K extends { id: infer Id extends string } ? Id : never
                ]: K extends { __valueType?: infer V }
                    ? [NonNullable<V>] extends [never]
                        ? (K extends { initialValue: infer IV } ? IV : any)
                        : NonNullable<V>
                    : K extends { initialValue: infer IV } ? IV : any
            }
            : never
        : never;

    /**
     * Infer runtime output values from a Blueprint.
     * 
     * Uses __valueType phantom if available (set by OutputBuilder.Message → BaseMessage, etc.)
     * Falls back to `any`.
     */
    export type InferOutputs<D> = D extends { outputs: infer T }
        ? T extends readonly { id: string }[]
            ? { [K in T[number] as K extends { __literalId?: infer Id extends string }
                ? Id
                : K extends { id: infer Id extends string } ? Id : never
                ]: K extends { __valueType?: infer V }
                    ? [NonNullable<V>] extends [never]
                        ? any
                        : NonNullable<V>
                    : any
            }
            : never
        : never;
}
