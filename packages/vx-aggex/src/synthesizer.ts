import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { LC } from "./langchain";
import { Foundations, Workflow } from "@vx-agent-editor/shared/types";
import { BaseLanguageModel } from "@langchain/core/language_models/base";


const LANGCHAIN_COMPONENT_MAP:
    Record<Workflow.Port., any>
= {
    "message": LC.HumanMessage,
    "languageModel": LC.BaseLanguageModel,
    "document": LC.Document,
    "retriever": LC.BaseRetriever,
    "embeddings": LC.Embeddings,
    "vectorStore": LC.VectorStore,
    "tool": LC.Tool,
    "dataFrame": null, // No direct LangChain equivalent
}

export class Synthesizer {


    public static ensureClassComponent(stateNodeOutput: any, variant: Foundations.Input.Ports.Schema["variant"]): any {
        const ComponentClass = LANGCHAIN_COMPONENT_MAP[variant];

        if (!ComponentClass) {
            throw new Error(`AGGEX Synthesizer: No class component mapping found for variant: ${variant}`);
        }

        // If it's already an instance of the correct class, return it
        if (stateNodeOutput instanceof ComponentClass) {
            return stateNodeOutput;
        }

        // Otherwise, attempt to create a new instance using the value
        try {
            return new ComponentClass(stateNodeOutput);
        } catch (error) {
            throw new Error(`AGGEX Synthesizer: Failed to coerce value into class component for variant: ${variant}. Error: ${error}`);
        }
    }

    public static createLC(schema: Foundations.Input | Foundations.Output, value: string){
        switch(schema.variant){
            case "message":
                return new HumanMessage(value)
            case "languageModel":
                return new Base
        }
    }

    public static coerceMessage(kind: "human" | "system" | "ai", input: LC.BaseMessage | string): LC.BaseMessage {
        const content = typeof input === "string" ? input : input.content;

        switch (kind) {
            case "system":
                return input instanceof SystemMessage ? input : new SystemMessage(content);
            case "human":
                return input instanceof HumanMessage ? input : new HumanMessage(content);
            case "ai":
                return input instanceof AIMessage ? input : new AIMessage(content);
        }
    }
}