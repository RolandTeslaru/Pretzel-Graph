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
        internal?: boolean;
    }

    function buildBase<TId extends string>(config: BaseProps<TId>) {
        return {
            id: config.id as TId & Foundations.Port.Output.Id,
            displayName: config.displayName,
            tooltip: config.tooltip,
            internal: config.internal,
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

    export function Data<TId extends string>(
        config: BaseProps<TId>
    ): LiteralOutput<TId, "Data", Foundations.Port.Variants.Data, any> {
        return {
            ...buildBase(config),
            variant: "Data" as const,
        };
    }

    export function DataList<TId extends string>(
        config: BaseProps<TId>
    ): LiteralOutput<TId, "DataList", Foundations.Port.Variants.DataList, any[]> {
        return {
            ...buildBase(config),
            variant: "DataList" as const,
        };
    }

    export function Unresolved<TId extends string, TSyncGroup extends string>(
        config: { syncGroupId: TSyncGroup } & BaseProps<TId>
    ): LiteralOutput<TId, "Unresolved", Foundations.Port.Variants.Unresolved, any> & { readonly __syncGroup?: TSyncGroup } {
        return {
            ...buildBase(config),
            variant: "Unresolved" as const,
            isDynamic: true,
            syncGroupId: config.syncGroupId,
            // Stores the blueprint variant so the port can be restored correctly on disconnection
            unresolvedVariant: "Unresolved" as const,
        };
    }

    export function UnresolvedList<TId extends string, TSyncGroup extends string>(
        config: { syncGroupId: TSyncGroup } & BaseProps<TId>
    ): LiteralOutput<TId, "UnresolvedList", Foundations.Port.Variants.UnresolvedList, any> & { readonly __syncGroup?: TSyncGroup } {
        return {
            ...buildBase(config),
            variant: "UnresolvedList" as const,
            isDynamic: true,
            syncGroupId: config.syncGroupId,
            // Stores the blueprint variant so the port can be restored correctly on disconnection
            unresolvedVariant: "UnresolvedList" as const,
        };
    }
}