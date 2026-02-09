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




    export abstract class Node<TBlueprint extends Foundations.Blueprint> {

        public workflowNode: Workflow.Node;

        public abstract Blueprint: TBlueprint;

        constructor(workflowNode: Workflow.Node) {
            this.workflowNode = workflowNode;
        }

        public abstract run(
            globalState: Runtime.State,
            incomingValues: InferInputs<TBlueprint>
        ): Promise<InferOutputs<TBlueprint>>;

        protected async onReconcile(
            changedInputId: Foundations.Input.Id,
            newValue: any,
            currentBlueprint: TBlueprint
        ): Promise<TBlueprint> {
            return Promise.resolve(currentBlueprint);
        }
    }

    // Note i didnt write this.
    // This was written by claude opus 4.5
    // This is all sorts of crazy

    /**
     * Infer runtime InputValues from a Definition.
     * Uses the __literalId phantom property if available, falls back to id.
     * Usage: type Inputs = InferInputs<typeof Definition>;
     */
    export type InferInputs<D> = D extends { inputs: infer T }
        ? T extends readonly { id: string; initialValue?: unknown }[]
        ? { [K in T[number]as K extends { __literalId?: infer Id extends string }
            ? Id
            : K extends { id: infer Id extends string } ? Id : never
            ]: K extends { initialValue: infer V } ? V : any }
        : never
        : never;

    /**
     * Infer runtime OutputValues from a Definition.
     * Uses the __literalId phantom property if available, falls back to id.
     * Usage: type Outputs = InferOutputs<typeof Definition>;
     */
    export type InferOutputs<D> = D extends { outputs: infer T }
        ? T extends readonly { id: string }[]
        ? { [K in T[number]as K extends { __literalId?: infer Id extends string }
            ? Id
            : K extends { id: infer Id extends string } ? Id : never
            ]: any }
        : never
        : never;
}
