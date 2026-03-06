import { Foundations } from "@vx-agent-editor/shared/domain";
import { LC } from "src/langchain";

export type LiteralInput<
    T_Id extends string,
    T_Variant extends Foundations.Port.Variant,
    T_Input extends Foundations.Port.Base,
    T_Reference = never,
> = {
    id: T_Id & Foundations.Port.Input.Id;
    required: boolean;
    readonly __literalId?: T_Id;
    readonly __variant?: T_Variant;
    readonly __reference?: T_Reference;
} & Omit<T_Input, "id">



export namespace InputBuilder {

    /** Props shared by port-type inputs (runtime object references). */
    export type BaseProps<TId extends string> = {
        id: TId;
        displayName: string;
        tooltip?: string;
        placeholder?: string;
    } & (
            | { internal?: false | undefined; required?: boolean }
            | { internal: true; required?: false }
        );

    function buildBase<TId extends string>(
        props: BaseProps<TId>,
    ) {
        return {
            id: props.id as TId & Foundations.Port.Input.Id,
            required: props.required ?? false,
            internal: props.internal ?? false,
            displayName: props.displayName,
            tooltip: props.tooltip,
        } satisfies { id: TId & Foundations.Port.Input.Id } & Omit<Foundations.Port.Input.Base, "id">;
    }



    // ---- Port Inputs (runtime object references) ----
    // These receive LangChain class instances at runtime.
    // Explicit return types ensure phantom properties (__literalId, __reference) are
    // visible to InferInputs for key extraction and value type resolution.

    export function Message<TId extends string>(
        config: { initialValue?: string } & BaseProps<TId>
    ): LiteralInput<TId, "Message", Foundations.Port.Variants.Message, LC.BaseMessage> {
        return {
            ...buildBase(config),
            variant: "Message" as const,
            initialValue: config.initialValue ?? "",
        };
    }


    export function Text<TId extends string>(
        config: { initialValue?: string } & BaseProps<TId>
    ): LiteralInput<TId, "Text", Foundations.Port.Variants.Text, string> {
        return {
            ...buildBase(config),
            variant: "Text" as const,
            initialValue: config.initialValue ?? ""
        };
    }

    export function LanguageModel<TId extends string>(
        config: BaseProps<TId>
    ): LiteralInput<TId, "LanguageModel", Foundations.Port.Variants.LanguageModel, LC.BaseLanguageModel> {
        return {
            ...buildBase(config),
            variant: "LanguageModel" as const,
        };
    }

    export function Document<TId extends string>(
        config: BaseProps<TId>
    ): LiteralInput<TId, "Document", Foundations.Port.Variants.Document, LC.Document> {
        return {
            ...buildBase(config),
            variant: "Document" as const,
        };
    }

    export function Retriever<TId extends string>(
        config: BaseProps<TId>
    ): LiteralInput<TId, "Retriever", Foundations.Port.Variants.Retriever, LC.BaseRetriever> {
        return {
            ...buildBase(config),
            variant: "Retriever" as const,
        };
    }

    export function Embeddings<TId extends string>(
        config: BaseProps<TId>
    ): LiteralInput<TId, "Embeddings", Foundations.Port.Variants.Embeddings, LC.Embeddings> {
        return {
            ...buildBase(config),
            variant: "Embeddings" as const,
        };
    }

    export function VectorStore<TId extends string>(
        config: BaseProps<TId>
    ): LiteralInput<TId, "VectorStore", Foundations.Port.Variants.VectorStore, LC.VectorStore> {
        return {
            ...buildBase(config),
            variant: "VectorStore" as const,
        };
    }

    export function Tool<TId extends string>(
        config: BaseProps<TId>
    ): LiteralInput<TId, "Tool", Foundations.Port.Variants.Tool, LC.Tool> {
        return {
            ...buildBase(config),
            variant: "Tool" as const,
        };
    }

    export function MessageList<TId extends string>(
        config: BaseProps<TId>
    ): LiteralInput<TId, "MessageList", Foundations.Port.Variants.MessageList, LC.BaseMessage[]> {
        return {
            ...buildBase(config),
            variant: "MessageList" as const,
        };
    }
}
