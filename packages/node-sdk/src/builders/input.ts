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
} & Omit<T_Input, "id">;

export namespace InputBuilder {
  export type BaseOptions<TReq extends boolean = false> = {
    tooltip?: string;
    placeholder?: string;
    groupId?: string;
  } & (
    | { internal?: false; required?: TReq }
    | { internal: true; required?: false }
  );

  function buildBase<TId extends string>(
    id: TId,
    displayName: string,
    options: BaseOptions<boolean>,
  ) {
    return {
      id: id as TId & Port.Input.Id,
      displayName,
      required: options.required ?? false,
      internal: options.internal ?? false,
      tooltip: options.tooltip,
      groupId: options.groupId as Port.Base["groupId"],
    } satisfies { id: TId & Port.Input.Id } & Omit<Port.Input.Base, "id">;
  }

  export function Message<TId extends string, TReq extends boolean = false>(
    id: TId,
    displayName: string,
    options: { initialValue?: string } & BaseOptions<TReq> = {},
  ): LiteralInput<TId, "Message", Port.Variants.Message, LC.BaseMessage, TReq> {
    return {
      ...buildBase(id, displayName, options),
      variant: "Message",
      initialValue: options.initialValue ?? "",
    };
  }

  export function Text<TId extends string, TReq extends boolean = false>(
    id: TId,
    displayName: string,
    options: { initialValue?: string } & BaseOptions<TReq> = {},
  ): LiteralInput<TId, "Text", Port.Variants.Text, string, TReq> {
    return {
      ...buildBase(id, displayName, options),
      variant: "Text",
      initialValue: options.initialValue ?? "",
    };
  }

  export function LanguageModel<
    TId extends string,
    TReq extends boolean = false,
  >(
    id: TId,
    displayName: string,
    options: BaseOptions<TReq> = {},
  ): LiteralInput<
    TId,
    "LanguageModel",
    Port.Variants.LanguageModel,
    LC.BaseChatModel,
    TReq
  > {
    return {
      ...buildBase(id, displayName, options),
      variant: "LanguageModel",
    };
  }

  export function Document<TId extends string, TReq extends boolean = false>(
    id: TId,
    displayName: string,
    options: BaseOptions<TReq> = {},
  ): LiteralInput<TId, "Document", Port.Variants.Document, LC.Document, TReq> {
    return {
      ...buildBase(id, displayName, options),
      variant: "Document",
    };
  }

  export function Retriever<TId extends string, TReq extends boolean = false>(
    id: TId,
    displayName: string,
    options: BaseOptions<TReq> = {},
  ): LiteralInput<
    TId,
    "Retriever",
    Port.Variants.Retriever,
    LC.BaseRetriever,
    TReq
  > {
    return {
      ...buildBase(id, displayName, options),
      variant: "Retriever",
    };
  }

  export function Embeddings<TId extends string, TReq extends boolean = false>(
    id: TId,
    displayName: string,
    options: BaseOptions<TReq> = {},
  ): LiteralInput<
    TId,
    "Embeddings",
    Port.Variants.Embeddings,
    LC.Embeddings,
    TReq
  > {
    return {
      ...buildBase(id, displayName, options),
      variant: "Embeddings",
    };
  }

  export function VectorStore<TId extends string, TReq extends boolean = false>(
    id: TId,
    displayName: string,
    options: BaseOptions<TReq> = {},
  ): LiteralInput<
    TId,
    "VectorStore",
    Port.Variants.VectorStore,
    LC.VectorStore,
    TReq
  > {
    return {
      ...buildBase(id, displayName, options),
      variant: "VectorStore",
    };
  }

  export function Tool<TId extends string, TReq extends boolean = false>(
    id: TId,
    displayName: string,
    options: BaseOptions<TReq> = {},
  ): LiteralInput<TId, "Tool", Port.Variants.Tool, LC.Tool, TReq> {
    return {
      ...buildBase(id, displayName, options),
      variant: "Tool",
    };
  }

  export function ToolList<TId extends string, TReq extends boolean = false>(
    id: TId,
    displayName: string,
    options: BaseOptions<TReq> = {},
  ): LiteralInput<TId, "ToolList", Port.Variants.ToolList, LC.Tool[], TReq> {
    return {
      ...buildBase(id, displayName, options),
      variant: "ToolList",
    };
  }

  export function MessageList<TId extends string, TReq extends boolean = false>(
    id: TId,
    displayName: string,
    options: BaseOptions<TReq> = {},
  ): LiteralInput<
    TId,
    "MessageList",
    Port.Variants.MessageList,
    LC.BaseMessage[],
    TReq
  > {
    return {
      ...buildBase(id, displayName, options),
      variant: "MessageList",
    };
  }

  export function Data<TId extends string, TReq extends boolean = false>(
    id: TId,
    displayName: string,
    options: BaseOptions<TReq> = {},
  ): LiteralInput<TId, "Data", Port.Variants.Data, any, TReq> {
    return {
      ...buildBase(id, displayName, options),
      variant: "Data",
    };
  }

  export function DataList<TId extends string, TReq extends boolean = false>(
    id: TId,
    displayName: string,
    options: BaseOptions<TReq> = {},
  ): LiteralInput<TId, "DataList", Port.Variants.DataList, any[], TReq> {
    return {
      ...buildBase(id, displayName, options),
      variant: "DataList",
    };
  }

  export function Unresolved<
    TId extends string,
    TPolymorphicGroup extends string,
    TReq extends boolean = false,
  >(
    id: TId,
    displayName: string,
    options: { polymorphicGroupId: TPolymorphicGroup } & BaseOptions<TReq>,
  ): LiteralInput<TId, "Unresolved", Port.Variants.Unresolved, any, TReq> & {
    readonly __polymorphicGroup?: TPolymorphicGroup;
  } {
    return {
      ...buildBase(id, displayName, options),
      variant: "Unresolved",
      polymorphicGroupId:
        options.polymorphicGroupId as unknown as Port.PolymorphicGroupId,
    };
  }

  export function UnresolvedScalar<
    TId extends string,
    TPolymorphicGroup extends string,
    TReq extends boolean = false,
  >(
    id: TId,
    displayName: string,
    options: { polymorphicGroupId: TPolymorphicGroup } & BaseOptions<TReq>,
  ): LiteralInput<
    TId,
    "UnresolvedScalar",
    Port.Variants.UnresolvedScalar,
    any,
    TReq
  > & {
    readonly __polymorphicGroup?: TPolymorphicGroup;
  } {
    return {
      ...buildBase(id, displayName, options),
      variant: "UnresolvedScalar",
      polymorphicGroupId:
        options.polymorphicGroupId as unknown as Port.PolymorphicGroupId,
    };
  }

  export function UnresolvedList<
    TId extends string,
    TPolymorphicGroup extends string,
    TReq extends boolean = false,
  >(
    id: TId,
    displayName: string,
    options: { polymorphicGroupId: TPolymorphicGroup } & BaseOptions<TReq>,
  ): LiteralInput<
    TId,
    "UnresolvedList",
    Port.Variants.UnresolvedList,
    any,
    TReq
  > & {
    readonly __polymorphicGroup?: TPolymorphicGroup;
  } {
    return {
      ...buildBase(id, displayName, options),
      variant: "UnresolvedList",
      polymorphicGroupId:
        options.polymorphicGroupId as unknown as Port.PolymorphicGroupId,
    };
  }
}
