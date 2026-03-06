"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Synthesizer = void 0;
const messages_1 = require("@langchain/core/messages");
const langchain_1 = require("./langchain");
const StreamController_1 = require("./StreamController");
class Synthesizer {
    /**
     * Create an LC class instance from a static primitive value.
     * Called when a port input has NO incoming edge — the raw primitives
     * stored in `staticValues` / `initialValue` must be coerced into
     * the class instance the node's `run()` expects.
     */
    static synthesizeInput(input, staticValue) {
        switch (input.variant) {
            case "Message":
                return this.coerceMessage("human", staticValue);
            case "Text":
                return String(staticValue);
            case "Document":
                return new langchain_1.LC.Document({ pageContent: String(staticValue) });
            case "LanguageModel":
            case "Embeddings":
            case "VectorStore":
            case "Retriever":
            case "Tool":
                throw new Error(`AGGEX Synthesizer: Cannot synthesize variant "${input.variant}" ` +
                    `from a static value — it requires an incoming edge connection.`);
            default:
                throw new Error(`AGGEX Synthesizer: Unknown variant "${input.variant}"`);
        }
    }
    /**
     * Ensure a runtime value coming from an upstream edge conforms to the
     * expected LC class for the given port variant. Passes through values
     * that are already the correct type; coerces when possible.
     */
    static ensureReference(rawReference, variant) {
        switch (variant) {
            case "Message":
                if (rawReference instanceof langchain_1.LC.BaseMessage)
                    return rawReference;
                if (typeof rawReference === "string")
                    return new messages_1.HumanMessage(rawReference);
                throw this.coercionError(variant, rawReference);
            case "Text":
                if (typeof rawReference === "string")
                    return rawReference;
                return String(rawReference);
            case "Document":
                if (rawReference instanceof langchain_1.LC.Document)
                    return rawReference;
                if (typeof rawReference === "string")
                    return new langchain_1.LC.Document({ pageContent: rawReference });
                throw this.coercionError(variant, rawReference);
            case "LanguageModel":
                if (rawReference instanceof langchain_1.LC.BaseLanguageModel)
                    return rawReference;
                throw this.coercionError(variant, rawReference);
            case "Embeddings":
                if (rawReference instanceof langchain_1.LC.Embeddings)
                    return rawReference;
                throw this.coercionError(variant, rawReference);
            case "VectorStore":
                if (rawReference instanceof langchain_1.LC.VectorStore)
                    return rawReference;
                throw this.coercionError(variant, rawReference);
            case "Retriever":
                if (rawReference instanceof langchain_1.LC.BaseRetriever)
                    return rawReference;
                throw this.coercionError(variant, rawReference);
            case "Tool":
                if (rawReference instanceof langchain_1.LC.Tool)
                    return rawReference;
                throw this.coercionError(variant, rawReference);
            case "Data":
            case "DataFrame":
                // Pass through — no canonical LC class
                return rawReference;
            default:
                return rawReference;
                throw new Error(`AGGEX Synthesizer: Unknown variant "${variant}"`);
        }
    }
    /**
     * Coerce a string (or BaseMessage) into the specific message subclass.
     */
    static coerceMessage(kind, input) {
        const content = typeof input === "string" ? input : input.content;
        switch (kind) {
            case "system":
                return input instanceof messages_1.SystemMessage ? input : new messages_1.SystemMessage(content);
            case "human":
                return input instanceof messages_1.HumanMessage ? input : new messages_1.HumanMessage(content);
            case "ai":
                return input instanceof messages_1.AIMessage ? input : new messages_1.AIMessage(content);
        }
    }
    static coercionError(variant, value) {
        return new Error(`AGGEX Synthesizer: Cannot coerce value of type ` +
            `"${typeof value}" into variant "${variant}".`);
    }
    static synthesizeState(props) {
        const { executionContext, workflow, workflowCache, emit, jobId } = props;
        const syntheticState = {
            ...executionContext,
            workflow,
            workflowCache,
            jobId,
            emit,
            streamController: new StreamController_1.StreamController()
        };
        return syntheticState;
    }
}
exports.Synthesizer = Synthesizer;
