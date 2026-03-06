import { Foundations } from "@vx-agent-editor/shared/domain";
import { LC } from "src/langchain";

export type LiteralOutput<
    T_Id extends string,
    T_Variant extends Foundations.Port.Variant,
    T_Output extends Foundations.Port.Base,
    T_Reference = never,
> = {
    id: T_Id & Foundations.Port.Output.Id;
    readonly __literalId?: T_Id;
    readonly __variant?: T_Variant;
    readonly __reference?: T_Reference;
} & Omit<T_Output, "id">



export namespace OutputBuilder {

    export type BaseProps<TId extends string> = {
        id: TId;
        displayName: string;
        tooltip?: string;
    }

    function buildBase<TId extends string>(config: BaseProps<TId>) {
        return {
            id: config.id as TId & Foundations.Port.Output.Id,
            displayName: config.displayName,
            tooltip: config.tooltip,
        } satisfies { id: TId & Foundations.Port.Output.Id } & Omit<Foundations.Port.Output.Base, "id">;
    }

    export function Message<TId extends string>(
        config: BaseProps<TId>
    ): LiteralOutput<TId, "Message", Foundations.Port.Variants.Message, LC.BaseMessage> {
        return {
            ...buildBase(config),
            variant: "Message" as const,
        };
    }

    export function SystemMessage<TId extends string>(
        config: BaseProps<TId>
    ): LiteralOutput<TId, "SystemMessage", Foundations.Port.Variants.SystemMessage, LC.SystemMessage> {
        return {
            ...buildBase(config),
            variant: "SystemMessage" as const,
        };
    }

    export function AIMessage<TId extends string>(
        config: BaseProps<TId>
    ): LiteralOutput<TId, "AIMessage", Foundations.Port.Variants.AIMessage, LC.AIMessage> {
        return {
            ...buildBase(config),
            variant: "AIMessage" as const,
        };
    }

    export function HumanMessage<TId extends string>(
        config: BaseProps<TId>
    ): LiteralOutput<TId, "HumanMessage", Foundations.Port.Variants.HumanMessage, LC.HumanMessage> {
        return {
            ...buildBase(config),
            variant: "HumanMessage" as const,
        };
    }

    export function Text<TId extends string>(
        config: BaseProps<TId>
    ): LiteralOutput<TId, "Text", Foundations.Port.Variants.Text, string> {
        return {
            ...buildBase(config),
            variant: "Text" as const,
        };
    }

    export function LanguageModel<TId extends string>(
        config: BaseProps<TId>
    ): LiteralOutput<TId, "LanguageModel", Foundations.Port.Variants.LanguageModel, LC.BaseLanguageModel> {
        return {
            ...buildBase(config),
            variant: "LanguageModel" as const,
        };
    }

    export function Document<TId extends string>(
        config: BaseProps<TId>
    ): LiteralOutput<TId, "Document", Foundations.Port.Variants.Document, LC.Document> {
        return {
            ...buildBase(config),
            variant: "Document" as const,
        };
    }

    export function Retriever<TId extends string>(
        config: BaseProps<TId>
    ): LiteralOutput<TId, "Retriever", Foundations.Port.Variants.Retriever, LC.BaseRetriever> {
        return {
            ...buildBase(config),
            variant: "Retriever" as const,
        };
    }

    export function Embeddings<TId extends string>(
        config: BaseProps<TId>
    ): LiteralOutput<TId, "Embeddings", Foundations.Port.Variants.Embeddings, LC.Embeddings> {
        return {
            ...buildBase(config),
            variant: "Embeddings" as const,
        };
    }

    export function VectorStore<TId extends string>(
        config: BaseProps<TId>
    ): LiteralOutput<TId, "VectorStore", Foundations.Port.Variants.VectorStore, LC.VectorStore> {
        return {
            ...buildBase(config),
            variant: "VectorStore" as const,
        };
    }

    export function Tool<TId extends string>(
        config: BaseProps<TId>
    ): LiteralOutput<TId, "Tool", Foundations.Port.Variants.Tool, LC.Tool> {
        return {
            ...buildBase(config),
            variant: "Tool" as const,
        };
    }

    export function Integer<TId extends string>(
        config: BaseProps<TId>
    ): LiteralOutput<TId, "Integer", Foundations.Port.Variants.Integer, number> {
        return {
            ...buildBase(config),
            variant: "Integer" as const,
        };
    }

    export function Json<TId extends string>(
        config: BaseProps<TId>
    ): LiteralOutput<TId, "Json", Foundations.Port.Variants.Json, any> {
        return {
            ...buildBase(config),
            variant: "Json" as const,
        };
    }

    export function DataFrame<TId extends string>(
        config: BaseProps<TId>
    ): LiteralOutput<TId, "DataFrame", Foundations.Port.Variants.DataFrame, any> {
        return {
            ...buildBase(config),
            variant: "DataFrame" as const,
        };
    }

    export function MessageList<TId extends string>(
        config: BaseProps<TId>
    ): LiteralOutput<TId, "MessageList", Foundations.Port.Variants.MessageList, LC.BaseMessage[]> {
        return {
            ...buildBase(config),
            variant: "MessageList" as const,
        };
    }
}