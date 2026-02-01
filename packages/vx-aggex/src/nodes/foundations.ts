import { Workflow } from "@vx-agent-builder/shared/types/Workflow"
import { z } from "zod"


export namespace Engine {
    export type GlobalState = {
        some: string
    }
}

export namespace Foundations {
    export abstract class Node<TDefinition extends Foundations.Node.Definition> {

        public workflowNode: Workflow.Node;

        public id: Workflow.Node.Id;

        constructor(workflowNode: Workflow.Node) {
            this.workflowNode = workflowNode;
            this.id = workflowNode.id;
        }

        public abstract run(
            globalState: Engine.GlobalState,
            incomingValues: Foundations.InferInputs<TDefinition>
        ): Promise<Foundations.InferOutputs<TDefinition>>;

        protected onReconcile(
            changedInputId: Workflow.Node.Input.Id,
            newValue: any,
            currentDefinition: TDefinition
        ): TDefinition {
            return currentDefinition;
        }
    }

    export namespace Node {
        export type Definition = {
            id: string,
            inputs: Record<string, any>
            outputs: Record<string, any>
            displayName: string
            description: string
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
    export type InferInputs<D extends Node.Definition> = {
        [K in keyof D["inputs"]]: ExtractInputValue<D["inputs"][K]>
    };

    /**
     * Infer runtime OutputValues from a Definition.
     * Maps output keys to their expected return types.
     * For now, outputs are typed as `any` since output types are dynamic.
     * You can refine this based on langChainDataTypes if needed.
     */
    export type InferOutputs<D extends Node.Definition> = {
        [K in keyof D["outputs"]]: any
    };


    export namespace Input {


        export function Float(props: {
            initialValue: number,
            required: boolean,
            displayName: string,
            tooltip: string,
            placeholder: string,
            langChainDataTypes: Workflow.Node.LangChainDataType[],
            reconcile: true,
            min?: number,
            max?: number,
            step?: number,
            slider?: boolean,
        }) {

        }

        export function MultiOption(props: {
            initialValue: string,
            variant: Workflow.Node.Input.MultiOption["data"]["variant"],
            options: string[],
            required: boolean,
            displayName: string,
            tooltip: string,
            placeholder: string,
            langChainDataTypes: Workflow.Node.LangChainDataType[],
            reconcile: true,
        }) {

        }

    }
}

