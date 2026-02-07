import { CompiledStateGraph, MessagesValue, ReducedValue, StateSchema } from "@langchain/langgraph";
import { Foundations, Orchestrator } from "@vx-agent-editor/shared/types";
import { Workflow } from "@vx-agent-editor/shared/types/Workflow";
import z from "zod";
import { EventBuilder } from "./eventBuilder";


// 1. Define the State Annotation (The Schema)

export namespace Runtime {

    export type Emitter = (
        callbackFn: (eventBuilder: EventBuilder) => Orchestrator.Event
    ) => void

    export namespace State {
        export const Schema = new StateSchema({
            node_outputs: new ReducedValue(
                z.record(Workflow.Node.Id, z.any()).default(() => ({})),
                {
                    reducer: (x, y) => ({ ...x, ...y }),
                }
            ),
            messages: MessagesValue,
            artifacts: new ReducedValue(
                z.record(z.string(), z.any()).default(() => ({})),
                {
                    reducer: (x, y) => ({ ...x, ...y }),
                }
            ),
            metadata: new ReducedValue(
                z.record(z.string(), z.any()).default(() => ({})),
                {
                    reducer: (x, y) => ({ ...x, ...y }),
                }
            ),
        });
        export const Update = State.Schema.Update
        export type Update = typeof Update

        export const INITIAL = {
            node_outputs: {},
            messages: [],
            artifacts: {},
            metadata: {}
        } as const as State
    }
    export type State = typeof State.Schema.State

    // I have no clue 
    export type CompiledGraph = CompiledStateGraph<
        State,
        typeof State.Schema.Update,
        string,
        typeof State.Schema,
        typeof State.Schema
    >




    export abstract class Node<TDefinition extends Foundations.NodeDefinition> {

        public workflowNode: Workflow.Node;

        constructor(workflowNode: Workflow.Node) {
            this.workflowNode = workflowNode;
        }

        public abstract run(
            globalState: Runtime.State,
            incomingValues: InferInputs<TDefinition>
        ): Promise<InferOutputs<TDefinition>>;

        protected async onReconcile(
            changedInputId: Foundations.Input.Id,
            newValue: any,
            currentDefinition: TDefinition
        ): Promise<TDefinition> {
            return Promise.resolve(currentDefinition);
        }
    }

    /**
     * Extracts the runtime value type from an input definition.
     * Input.String with initialValue: string → string
     * Input.Float with initialValue: number → number
     * Input.Boolean with initialValue: boolean → boolean
     * etc.
     */
    type ExtractInputValue<T> = T extends { initialValue: infer V } ? V : any;

    /**
     * Infer runtime InputValues from a Definition.
     * Usage: type Inputs = InferInputs<typeof Definition>;
     */
    export type InferInputs<D extends Foundations.NodeDefinition> = {
        [K in keyof D["inputs"]]: ExtractInputValue<D["inputs"][K]>
    };

    /**
     * Infer runtime OutputValues from a Definition.
     * Maps output keys to their expected return types.
     * For now, outputs are typed as `any` since output types are dynamic.
     * You can refine this based on langChainDataTypes if needed.
     */
    export type InferOutputs<D extends Foundations.NodeDefinition> = {
        [K in keyof D["outputs"]]: any
    };
}

