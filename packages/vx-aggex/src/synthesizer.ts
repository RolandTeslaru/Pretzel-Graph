import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { LC } from "./langchain";
import { Foundations } from "@vx-agent-editor/shared/types";


export class Synthesizer {

    /**
     * Create an LC class instance from a static primitive value.
     * Called when a port input has NO incoming edge — the raw primitives
     * stored in `staticValues` / `initialValue` must be coerced into
     * the class instance the node's `run()` expects.
     */
    public static synthesizeInput(
        input:       Foundations.Port.Input, 
        staticValue: Foundations.NodeConfig.Value
    ): any {
        switch (input.variant) {
            case "Message":
                return this.coerceMessage("human", staticValue as string);

            case "Text":
                return String(staticValue);

            case "Document":
                return new LC.Document({ pageContent: String(staticValue) });

            case "LanguageModel":
            case "Embeddings":
            case "VectorStore":
            case "Retriever":
            case "Tool":
                throw new Error(
                    `AGGEX Synthesizer: Cannot synthesize variant "${input.variant}" ` +
                    `from a static value — it requires an incoming edge connection.`
                );

            default:
                throw new Error(
                    `AGGEX Synthesizer: Unknown variant "${(input as any).variant}"`
                );
        }
    }


    /**
     * Ensure a runtime value coming from an upstream edge conforms to the
     * expected LC class for the given port variant. Passes through values
     * that are already the correct type; coerces when possible.
     */
    public static ensureReference(
        value:   any,
        variant: Foundations.Port.Variant
    ): any {
        switch (variant) {
            case "Message":
                if (value instanceof LC.BaseMessage) return value;
                if (typeof value === "string") return new HumanMessage(value);
                throw this.coercionError(variant, value);

            case "Text":
                if (typeof value === "string") return value;
                return String(value);

            case "Document":
                if (value instanceof LC.Document) return value;
                if (typeof value === "string") return new LC.Document({ pageContent: value });
                throw this.coercionError(variant, value);

            case "LanguageModel":
                if (value instanceof LC.BaseLanguageModel) return value;
                throw this.coercionError(variant, value);

            case "Embeddings":
                if (value instanceof LC.Embeddings) return value;
                throw this.coercionError(variant, value);

            case "VectorStore":
                if (value instanceof LC.VectorStore) return value;
                throw this.coercionError(variant, value);

            case "Retriever":
                if (value instanceof LC.BaseRetriever) return value;
                throw this.coercionError(variant, value);

            case "Tool":
                if (value instanceof LC.Tool) return value;
                throw this.coercionError(variant, value);

            case "Data":
            case "DataFrame":
                // Pass through — no canonical LC class
                return value;

            default:
                throw new Error(
                    `AGGEX Synthesizer: Unknown variant "${variant}"`
                );
        }
    }


    /**
     * Coerce a string (or BaseMessage) into the specific message subclass.
     */
    public static coerceMessage(
        kind:  "human" | "system" | "ai",
        input: LC.BaseMessage | string
    ): LC.BaseMessage {
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


    private static coercionError(variant: string, value: any): Error {
        return new Error(
            `AGGEX Synthesizer: Cannot coerce value of type ` +
            `"${typeof value}" into variant "${variant}".`
        );
    }
}