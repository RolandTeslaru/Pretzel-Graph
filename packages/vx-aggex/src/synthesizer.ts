import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { LC } from "./langchain";
import { Foundations, Orchestrator, Workflow, ExecutionSession } from "@vx-agent-editor/shared/domain";
import { StreamController } from "./StreamController";
import { RuntimeState } from "./runtime";
import { Emitter } from "./event/emitter";

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
                if (rawReference instanceof LC.BaseMessage) return rawReference;
                if (typeof rawReference === "string") return new HumanMessage(rawReference);
                throw this.coercionError(variant, rawReference);

            case "Text":
                if (typeof rawReference === "string") return rawReference;
                return String(rawReference);

            case "Document":
                if (rawReference instanceof LC.Document) return rawReference;
                if (typeof rawReference === "string") return new LC.Document({ pageContent: rawReference });
                throw this.coercionError(variant, rawReference);

            case "LanguageModel":
                if (rawReference instanceof LC.BaseLanguageModel) return rawReference;
                throw this.coercionError(variant, rawReference);

            case "Embeddings":
                if (rawReference instanceof LC.Embeddings) return rawReference;
                throw this.coercionError(variant, rawReference);

            case "VectorStore":
                if (rawReference instanceof LC.VectorStore) return rawReference;
                throw this.coercionError(variant, rawReference);

            case "Retriever":
                if (rawReference instanceof LC.BaseRetriever) return rawReference;
                throw this.coercionError(variant, rawReference);

            case "Tool":
                if (rawReference instanceof LC.Tool) return rawReference;
                throw this.coercionError(variant, rawReference);

            case "Data":
            case "DataFrame":
                // Pass through — no canonical LC class
                return rawReference;            
            default:
                return rawReference;
                throw new Error(
                    `AGGEX Synthesizer: Unknown variant "${variant}"`
                );
        }
    }


    /**
     * Coerce a string (or BaseMessage) into the specific message subclass.
     */
    public static coerceMessage(
        kind: "human" | "system" | "ai",
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

    public static synthesizeState(props: { 
        session: ExecutionSession, 
        workflow: Workflow, 
        workflowCache: Workflow.Cache,
        emit: Emitter,
        jobId: Orchestrator.Job.Id
    }) {
        const { session, workflow, workflowCache, emit, jobId } = props

        const syntheticState = {
            ...session,
            workflow,
            workflowCache,
            jobId,
            emit,
            streamController: new StreamController()
        } as unknown as RuntimeState;

        return syntheticState;
    }
}