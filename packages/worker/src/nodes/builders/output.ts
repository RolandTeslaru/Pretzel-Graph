import { Port } from "@vx-agent-editor/shared/domain/Foundations/Port";
import { LC } from "src/langchain";

export type LiteralOutput<
    T_Id extends string,
    T_Variant extends Port.Variant,
    T_Output extends Port.Base,
    T_Reference = never,
> = {
    id: T_Id & Port.Output.Id;
    readonly __literalId?: T_Id;
    readonly __variant?: T_Variant;
    readonly __reference?: T_Reference;
} & Omit<T_Output, "id">



export namespace OutputBuilder {

    export type BaseProps<TId extends string> = {
        id: TId;
        displayName: string;
        tooltip?: string;
        internal?: boolean;
    }

    function buildBase<TId extends string>(config: BaseProps<TId>) {
        return {
            id: config.id as TId & Port.Output.Id,
            displayName: config.displayName,
            tooltip: config.tooltip,
            internal: config.internal,
        } satisfies { id: TId & Port.Output.Id } & Omit<Port.Output.Base, "id">;
    }

    export function Message<TId extends string>(
        config: BaseProps<TId>
    ): LiteralOutput<TId, "Message", Port.Variants.Message, LC.BaseMessage> {
        return {
            ...buildBase(config),
            variant: "Message" as const,
        };
    }


    export function Text<TId extends string>(
        config: BaseProps<TId>
    ): LiteralOutput<TId, "Text", Port.Variants.Text, string> {
        return {
            ...buildBase(config),
            variant: "Text" as const,
        };
    }

    export function LanguageModel<TId extends string>(
        config: BaseProps<TId>
    ): LiteralOutput<TId, "LanguageModel", Port.Variants.LanguageModel, LC.BaseChatModel> {
        return {
            ...buildBase(config),
            variant: "LanguageModel" as const,
        };
    }

    export function Document<TId extends string>(
        config: BaseProps<TId>
    ): LiteralOutput<TId, "Document", Port.Variants.Document, LC.Document> {
        return {
            ...buildBase(config),
            variant: "Document" as const,
        };
    }

    export function Retriever<TId extends string>(
        config: BaseProps<TId>
    ): LiteralOutput<TId, "Retriever", Port.Variants.Retriever, LC.BaseRetriever> {
        return {
            ...buildBase(config),
            variant: "Retriever" as const,
        };
    }

    export function Embeddings<TId extends string>(
        config: BaseProps<TId>
    ): LiteralOutput<TId, "Embeddings", Port.Variants.Embeddings, LC.Embeddings> {
        return {
            ...buildBase(config),
            variant: "Embeddings" as const,
        };
    }

    export function VectorStore<TId extends string>(
        config: BaseProps<TId>
    ): LiteralOutput<TId, "VectorStore", Port.Variants.VectorStore, LC.VectorStore> {
        return {
            ...buildBase(config),
            variant: "VectorStore" as const,
        };
    }

    export function Tool<TId extends string>(
        config: BaseProps<TId>
    ): LiteralOutput<TId, "Tool", Port.Variants.Tool, LC.Tool> {
        return {
            ...buildBase(config),
            variant: "Tool" as const,
        };
    }

    export function ToolList<TId extends string>(
        config: BaseProps<TId>
    ): LiteralOutput<TId, "ToolList", Port.Variants.ToolList, LC.Tool[]> {
        return {
            ...buildBase(config),
            variant: "ToolList" as const,
        };
    }

    export function Integer<TId extends string>(
        config: BaseProps<TId>
    ): LiteralOutput<TId, "Integer", Port.Variants.Integer, number> {
        return {
            ...buildBase(config),
            variant: "Integer" as const,
        };
    }

    export function Json<TId extends string>(
        config: BaseProps<TId>
    ): LiteralOutput<TId, "Json", Port.Variants.Json, any> {
        return {
            ...buildBase(config),
            variant: "Json" as const,
        };
    }

    export function DataFrame<TId extends string>(
        config: BaseProps<TId>
    ): LiteralOutput<TId, "DataFrame", Port.Variants.DataFrame, any> {
        return {
            ...buildBase(config),
            variant: "DataFrame" as const,
        };
    }

    export function MessageList<TId extends string>(
        config: BaseProps<TId>
    ): LiteralOutput<TId, "MessageList", Port.Variants.MessageList, LC.BaseMessage[]> {
        return {
            ...buildBase(config),
            variant: "MessageList" as const,
        };
    }

    export function Data<TId extends string>(
        config: BaseProps<TId>
    ): LiteralOutput<TId, "Data", Port.Variants.Data, any> {
        return {
            ...buildBase(config),
            variant: "Data" as const,
        };
    }

    export function DataList<TId extends string>(
        config: BaseProps<TId>
    ): LiteralOutput<TId, "DataList", Port.Variants.DataList, any[]> {
        return {
            ...buildBase(config),
            variant: "DataList" as const,
        };
    }

    export function Unresolved<TId extends string, TSyncGroup extends string>(
        config: { polymorphicGroupId: TSyncGroup } & BaseProps<TId>
    ): LiteralOutput<TId, "Unresolved", Port.Variants.Unresolved, any> & { readonly __syncGroup?: TSyncGroup } {
        return {
            ...buildBase(config),
            variant: "Unresolved" as const,
            polymorphicGroupId: config.polymorphicGroupId,
            originalVariant: "Unresolved" as const,
        };
    }

    export function UnresolvedScalar<TId extends string, TSyncGroup extends string>(
        config: { polymorphicGroupId: TSyncGroup } & BaseProps<TId>
    ): LiteralOutput<TId, "UnresolvedScalar", Port.Variants.UnresolvedScalar, any> & { readonly __syncGroup?: TSyncGroup } {
        return {
            ...buildBase(config),
            variant: "UnresolvedScalar" as const,
            polymorphicGroupId: config.polymorphicGroupId,
            originalVariant: "UnresolvedScalar" as const,
        };
    }

    export function UnresolvedList<TId extends string, TSyncGroup extends string>(
        config: { polymorphicGroupId: TSyncGroup } & BaseProps<TId>
    ): LiteralOutput<TId, "UnresolvedList", Port.Variants.UnresolvedList, any> & { readonly __syncGroup?: TSyncGroup } {
        return {
            ...buildBase(config),
            variant: "UnresolvedList" as const,
            polymorphicGroupId: config.polymorphicGroupId,
            originalVariant: "UnresolvedList" as const,
        };
    }
}