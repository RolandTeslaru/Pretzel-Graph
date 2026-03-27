import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { LC } from "../langchain";
import { Foundations } from "@vx-agent-editor/shared/domain";
import { SystemError } from "@vx-agent-editor/shared/domain/SystemError";

export class Synthesizer {

    /**
     * Create an LC class instance from a static primitive value.
     * Called when a port input has NO incoming edge — the raw primitives
     * stored in `staticValues` / `initialValue` must be coerced into
     * the class instance the node's `run()` expects.
     */
    public static synthesizeInput(
        input: Foundations.Port.Input,
        staticValue: any
    ): any {
        switch (input.variant) {
            case "Message":
                return this.coerceMessage("human", staticValue as string);
            case "MessageList":
                if(Array.isArray(staticValue)){
                    if(staticValue.every(el => typeof el === "string")){
                        return staticValue.map(str => this.coerceMessage("human", str));
                    }
                    else if(staticValue.every(el => typeof el === "object" && "content" in el && typeof el.content === "string")){
                        return staticValue.map(msgObj => this.coerceMessage("human", msgObj as LC.BaseMessage | string));
                    }
                    else {
                        throw new SystemError(
                            SystemError.Code.CONFIG_INVALID_FIELD,
                            `Invalid initial value for MessageList input — expected an array of strings or message objects.`
                        );
                    }
                }
                else {
                    return [this.coerceMessage("human", staticValue as string)];
                }
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
        rawReference: any,
        variant: Foundations.Port.Variant
    ): any {
        switch (variant) {
            case "Message":
                if (rawReference instanceof LC.BaseMessage)
                    return rawReference;
                if (typeof rawReference === "string")
                    return new HumanMessage(rawReference);

                throw new SystemError(
                    SystemError.Code.EXECUTION_TYPE_MISMATCH,
                    `Cannot coerce value of type "${typeof rawReference}" into variant "${variant}"`,
                    { data: { variant } }
                );

            case "Text":
                if (typeof rawReference === "string")
                    return rawReference;
                return String(rawReference);

            case "Document":
                if (rawReference instanceof LC.Document)
                    return rawReference;
                if (typeof rawReference === "string")
                    return new LC.Document({ pageContent: rawReference });
                throw new SystemError(
                    SystemError.Code.EXECUTION_TYPE_MISMATCH,
                    `Cannot coerce value of type "${typeof rawReference}" into variant "${variant}"`,
                    { data: { variant } }
                );

            case "LanguageModel":
                if (rawReference instanceof LC.BaseLanguageModel)
                    return rawReference;
                throw new SystemError(
                    SystemError.Code.EXECUTION_TYPE_MISMATCH,
                    `Cannot coerce value of type "${typeof rawReference}" into variant "${variant}"`,
                    { data: { variant } }
                );

            case "Embeddings":
                if (rawReference instanceof LC.Embeddings)
                    return rawReference;
                throw new SystemError(
                    SystemError.Code.EXECUTION_TYPE_MISMATCH,
                    `Cannot coerce value of type "${typeof rawReference}" into variant "${variant}"`,
                    { data: { variant } }
                );

            case "VectorStore":
                if (rawReference instanceof LC.VectorStore)
                    return rawReference;
                throw new SystemError(
                    SystemError.Code.EXECUTION_TYPE_MISMATCH,
                    `Cannot coerce value of type "${typeof rawReference}" into variant "${variant}"`,
                    { data: { variant } }
                );

            case "Retriever":
                if (rawReference instanceof LC.BaseRetriever)
                    return rawReference;
                throw new SystemError(
                    SystemError.Code.EXECUTION_TYPE_MISMATCH,
                    `Cannot coerce value of type "${typeof rawReference}" into variant "${variant}"`,
                    { data: { variant } }
                );

            case "Tool":
                if (rawReference instanceof LC.Tool)
                    return rawReference;
                throw new SystemError(
                    SystemError.Code.EXECUTION_TYPE_MISMATCH,
                    `Cannot coerce value of type "${typeof rawReference}" into variant "${variant}"`,
                    { data: { variant } }
                );

            case "MessageList":
                if (Array.isArray(rawReference) && rawReference.every(el => el instanceof LC.BaseMessage))
                    return rawReference;
                throw new SystemError(
                    SystemError.Code.EXECUTION_TYPE_MISMATCH,
                    `Cannot coerce value into variant "${variant}" — expected an array of BaseMessage`,
                    { data: { variant } }
                );

            case "DataList":
                // Pass through — no canonical LC class for arbitrary data lists
                return rawReference;

            case "Data":
            case "DataFrame":
                // Pass through — no canonical LC class
                return rawReference;
            default:
                throw new SystemError(
                    SystemError.Code.CONFIG_INVALID_FIELD,
                    `Unknown port variant "${variant}"`,
                    { data: { variant } }
                );
        }
    }


    /**
     * Coerce a string (or BaseMessage) into the specific message subclass.
     */
    public static coerceMessage(
        kind: "human" | "system" | "ai" | string,
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
            default:
                throw new SystemError(
                    SystemError.Code.CONFIG_INVALID_FIELD,
                    `Unsupported message role "${kind}" — only human, system, and ai are supported`,
                    { data: { kind } }
                );
        }
    }
}