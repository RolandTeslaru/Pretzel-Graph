import { CompiledStateGraph, MessagesValue, ReducedValue, StateSchema } from "@langchain/langgraph";
import { Foundations, Orchestrator } from "@vx-agent-editor/shared/types";
import { Workflow } from "@vx-agent-editor/shared/types/Workflow";
import { EventBuilder } from "./eventBuilder";
import { LC } from "./langchain";


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
        state:      Runtime.State,
        activeNode: Workflow.Node,
        Vertex:     Runtime.Node<Foundations.Blueprint>,
        workflow:   Workflow,
        emit:       Runtime.Emitter
    ) => Promise<State.Update>


    export abstract class Node<TBlueprint extends Foundations.Blueprint> {

        public workflowNode: Workflow.Node;

        public abstract Blueprint: TBlueprint;

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
            config: InferConfig<TBlueprint>,
            inputs: InferInputs<TBlueprint>
        ): Promise<InferOutputs<TBlueprint>>;

        protected async onReconcile(
            changedConfigId: Foundations.NodeConfig.Id,
            newValue: Foundations.NodeConfig.Value,
            currentBlueprint: TBlueprint
        ): Promise<TBlueprint> {
            return currentBlueprint
        }

        protected async onConversion(
            currentBlueprint: TBlueprint
        ): Promise<TBlueprint> {
            return currentBlueprint
        }
    }

    

    /**
     * Infer static config values from a Blueprint.
     * 
     * Uses __literalId phantom for literal key names.
     * Maps each config field to its initialValue type.
     */
    export type InferConfig<D> = D extends { config: infer C }
        ? { [K in keyof C]: C[K] extends { __literalId?: infer _Id; initialValue: infer IV } ? IV : any }
        : Record<string, never>;

    /**
     * Infer runtime port input values from a Blueprint.
     * 
     * Uses __reference phantom if present (set by InputBuilder.Message → BaseMessage, etc.)
     * Falls back to initialValue type, then `any`.
     */
    export type InferInputs<D> = D extends { inputs: infer T }
        ? T extends readonly { id: string }[]
            ? { [K in T[number] as K extends { __literalId?: infer Id extends string }
                ? Id
                : K extends { id: infer Id extends string } ? Id : never
                ]: K extends { __reference?: infer V }
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
     * Uses __reference phantom if present (set by OutputBuilder.Message → BaseMessage, etc.)
     * Falls back to `any`.
     */
    export type InferOutputs<D> = D extends { outputs: infer T }
        ? T extends readonly { id: string }[]
            ? { [K in T[number] as K extends { __literalId?: infer Id extends string }
                ? Id
                : K extends { id: infer Id extends string } ? Id : never
                ]: K extends { __reference?: infer V }
                    ? [NonNullable<V>] extends [never]
                        ? any
                        : NonNullable<V>
                    : any
            }
            : never
        : never;
}
