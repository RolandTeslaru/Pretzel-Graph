import { z } from "zod"
import { CatalogueService } from "../../../../services/Catalogue/service";
import { Engine, Foundations } from "../../../foundations";
import { Workflow } from "@vx-agent-editor/shared/types/Workflow";
import { InputBuilder, OutputBuilder } from "src/nodes/builders";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { HumanMessage } from "@langchain/core/messages";

export const Definition = {
    id: "Google.Chat.v1",
    displayName: "Google Chat Node",
    description: "This node talks to google chat api",
    inputs: {
        api_key: InputBuilder.Secret({
            displayName: "API Key",
            initialValue: "",
        }),
        prompt: InputBuilder.String({
            displayName: "Prompt",
            required: true,
            initialValue: "",
            hasHandle: true,
        }),
        model: InputBuilder.MultiOption({
            displayName: "Model",
            options: [
                "gemini-1.5-flash",
                "gemini-1.5-pro",
                "gemini-1.0-pro"
            ],
            initialValue: "gemini-1.5-flash",
        }),
        temperature: InputBuilder.Float({
            displayName: "Temperature",
            required: false,
            initialValue: 0.7,
            min: 0,
            max: 2.0,
            step: 0.1,
            tooltip: "Controls randomness in the output. Higher values are more creative.",
            hasHandle: false,
        }),
        maxOutputTokens: InputBuilder.Integer({
            displayName: "Max Output Tokens",
            required: false,
            initialValue: 2048,
            min: 1,
            step: 1,
            tooltip: "Maximum number of tokens to generate.",
            hasHandle: false,
        }),
        topP: InputBuilder.Float({
            displayName: "Top P",
            required: false,
            initialValue: 0.95,
            min: 0,
            max: 1,
            step: 0.01,
            tooltip: "Nucleus sampling probability.",
            hasHandle: false,
        }),
        topK: InputBuilder.Integer({
            displayName: "Top K",
            required: false,
            initialValue: 64,
            min: 1,
            step: 1,
            tooltip: "Top-K sampling parameter.",
            hasHandle: false,
        }),
    },
    outputs: {
        response: OutputBuilder.Message({
            displayName: "Response",
            tooltip: "The response from the model",
        })
    }
} satisfies Foundations.Node.Definition



@CatalogueService.Register(Definition.id)
export class Node extends Foundations.Node<typeof Definition> {

    public static Definition = Definition;

    constructor(workflowNode: Workflow.Node) {
        super(workflowNode);
    }

    public override async run(
        state: Engine.GlobalState,
        incomingValues: Foundations.InferInputs<typeof Definition>
    ): Promise<Foundations.InferOutputs<typeof Definition>> {

        const { model, prompt, api_key, temperature, maxOutputTokens, topP, topK } = incomingValues;

        const llm = new ChatGoogleGenerativeAI({
            model: model,
            apiKey: api_key,
            maxOutputTokens: maxOutputTokens,
            temperature: temperature,
            topP: topP,
            topK: topK,
        });

        const response = await llm.invoke([
            new HumanMessage(prompt)
        ]);

        return { response: response }
    }


    public override async onReconcile(
        changedInputId: Workflow.Node.Input.Id,
        newValue: any,
        currentDefinition: typeof Definition
    ): Promise<typeof Definition> {
        return Promise.resolve(currentDefinition);
    }
}