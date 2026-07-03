import { Port } from "@pretzel-graph/shared/domain/Foundations/Port";
import { LC } from "../langchain";

export type LiteralInput<
    T_Id extends string,
    T_Variant extends Port.Variant,
    T_Input extends Port.Base,
    T_Reference = never,
    T_Required extends boolean = false,
> = {
    id: T_Id & Port.Input.Id;
    required: boolean;
    readonly __literalId?: T_Id;
    readonly __variant?: T_Variant;
    readonly __reference?: T_Reference;
    readonly __required?: T_Required;
} & Omit<T_Input, "id">



export namespace InputBuilder {

    /** Props shared by port-type inputs (runtime object references). */
    export type BaseProps<TId extends string, TReq extends boolean = false> = {
        id: TId;
        displayName: string;
        tooltip?: string;
        placeholder?: string;
        groupId?: string;
    } & (
            | { internal?: false | undefined; required?: TReq }
            | { internal: true; required?: false }
        );

    function buildBase<TId extends string>(
        props: BaseProps<TId, boolean>,
    ) {
        return {
            id: props.id as TId & Port.Input.Id,
            required: props.required ?? false,
            internal: props.internal ?? false,
            displayName: props.displayName,
            tooltip: props.tooltip,
            groupId: props.groupId as Port.Base["groupId"],
        } satisfies { id: TId & Port.Input.Id } & Omit<Port.Input.Base, "id">;
    }

    // ---- Port Inputs (runtime object references) ----
    // These receive LangChain class instances at runtime.
    // Explicit return types ensure phantom properties (__literalId, __reference, __required) are
    // visible to InferIncoming for key extraction, value type resolution, and optionality.

    export function Message<TId extends string, TReq extends boolean = false>(
        config: { initialValue?: string } & BaseProps<TId, TReq>
    ): LiteralInput<TId, "Message", Port.Variants.Message, LC.BaseMessage, TReq> {
        return {
            ...buildBase(config),
            variant: "Message" as const,
            initialValue: config.initialValue ?? "",
        };
    }


    export function Text<TId extends string, TReq extends boolean = false>(
        config: { initialValue?: string } & BaseProps<TId, TReq>
    ): LiteralInput<TId, "Text", Port.Variants.Text, string, TReq> {
        return {
            ...buildBase(config),
            variant: "Text" as const,
            initialValue: config.initialValue ?? ""
        };
    }

    export function LanguageModel<TId extends string, TReq extends boolean = false>(
        config: BaseProps<TId, TReq>
    ): LiteralInput<TId, "LanguageModel", Port.Variants.LanguageModel, LC.BaseChatModel, TReq> {
        return {
            ...buildBase(config),
            variant: "LanguageModel" as const,
        };
    }

    export function Document<TId extends string, TReq extends boolean = false>(
        config: BaseProps<TId, TReq>
    ): LiteralInput<TId, "Document", Port.Variants.Document, LC.Document, TReq> {
        return {
            ...buildBase(config),
            variant: "Document" as const,
        };
    }

    export function Retriever<TId extends string, TReq extends boolean = false>(
        config: BaseProps<TId, TReq>
    ): LiteralInput<TId, "Retriever", Port.Variants.Retriever, LC.BaseRetriever, TReq> {
        return {
            ...buildBase(config),
            variant: "Retriever" as const,
        };
    }

    export function Embeddings<TId extends string, TReq extends boolean = false>(
        config: BaseProps<TId, TReq>
    ): LiteralInput<TId, "Embeddings", Port.Variants.Embeddings, LC.Embeddings, TReq> {
        return {
            ...buildBase(config),
            variant: "Embeddings" as const,
        };
    }

    export function VectorStore<TId extends string, TReq extends boolean = false>(
        config: BaseProps<TId, TReq>
    ): LiteralInput<TId, "VectorStore", Port.Variants.VectorStore, LC.VectorStore, TReq> {
        return {
            ...buildBase(config),
            variant: "VectorStore" as const,
        };
    }

    export function Tool<TId extends string, TReq extends boolean = false>(
        config: BaseProps<TId, TReq>
    ): LiteralInput<TId, "Tool", Port.Variants.Tool, LC.Tool, TReq> {
        return {
            ...buildBase(config),
            variant: "Tool" as const,
        };
    }

    export function ToolList<TId extends string, TReq extends boolean = false>(
        config: BaseProps<TId, TReq>
    ): LiteralInput<TId, "ToolList", Port.Variants.ToolList, LC.Tool[], TReq> {
        return {
            ...buildBase(config),
            variant: "ToolList" as const,
        };
    }

    export function MessageList<TId extends string, TReq extends boolean = false>(
        config: BaseProps<TId, TReq>
    ): LiteralInput<TId, "MessageList", Port.Variants.MessageList, LC.BaseMessage[], TReq> {
        return {
            ...buildBase(config),
            variant: "MessageList" as const,
        };
    }

    export function Data<TId extends string, TReq extends boolean = false>(
        config: BaseProps<TId, TReq>
    ): LiteralInput<TId, "Data", Port.Variants.Data, any, TReq> {
        return {
            ...buildBase(config),
            variant: "Data" as const,
        };
    }

    export function DataList<TId extends string, TReq extends boolean = false>(
        config: BaseProps<TId, TReq>
    ): LiteralInput<TId, "DataList", Port.Variants.DataList, any[], TReq> {
        return {
            ...buildBase(config),
            variant: "DataList" as const,
        };
    }

    export function Unresolved<TId extends string, TPolymorphicGroup extends string, TReq extends boolean = false>(
        config: { polymorphicGroupId: TPolymorphicGroup } & BaseProps<TId, TReq>
    ): LiteralInput<TId, "Unresolved", Port.Variants.Unresolved, any, TReq> & { readonly __polymorphicGroup?: TPolymorphicGroup } {
        return {
            ...buildBase(config),
            variant: "Unresolved" as const,
            polymorphicGroupId: config.polymorphicGroupId as unknown as Port.PolymorphicGroupId,
        };
    }

    export function UnresolvedScalar<TId extends string, TPolymorphicGroup extends string, TReq extends boolean = false>(
        config: { polymorphicGroupId: TPolymorphicGroup } & BaseProps<TId, TReq>
    ): LiteralInput<TId, "UnresolvedScalar", Port.Variants.UnresolvedScalar, any, TReq> & { readonly __polymorphicGroup?: TPolymorphicGroup } {
        return {
            ...buildBase(config),
            variant: "UnresolvedScalar" as const,
            polymorphicGroupId: config.polymorphicGroupId as unknown as Port.PolymorphicGroupId,
        };
    }

    export function UnresolvedList<TId extends string, TPolymorphicGroup extends string, TReq extends boolean = false>(
        config: { polymorphicGroupId: TPolymorphicGroup } & BaseProps<TId, TReq>
    ): LiteralInput<TId, "UnresolvedList", Port.Variants.UnresolvedList, any, TReq> & { readonly __polymorphicGroup?: TPolymorphicGroup } {
        return {
            ...buildBase(config),
            variant: "UnresolvedList" as const,
            polymorphicGroupId: config.polymorphicGroupId as unknown as Port.PolymorphicGroupId,
        };
    }
}
