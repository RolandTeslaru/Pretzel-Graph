import { Port } from "@pretzel-graph/shared/domain/Foundations/Port";

import { LC } from "../langchain";

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
} & Omit<T_Output, "id">;

export namespace OutputBuilder {
  export type Options = {
    tooltip?: string;
    internal?: boolean;
    groupId?: string;
  };

  function buildBase<TId extends string>(
    id: TId,
    displayName: string,
    options: Options,
  ) {
    return {
      id: id as TId & Port.Output.Id,
      displayName,
      tooltip: options.tooltip,
      internal: options.internal,
      groupId: options.groupId as Port.Base["groupId"],
    } satisfies { id: TId & Port.Output.Id } & Omit<Port.Output.Base, "id">;
  }

  export function Message<TId extends string>(
    id: TId,
    displayName: string,
    options: Options = {},
  ): LiteralOutput<TId, "Message", Port.Variants.Message, LC.BaseMessage> {
    return {
      ...buildBase(id, displayName, options),
      variant: "Message",
    };
  }

  export function Text<TId extends string>(
    id: TId,
    displayName: string,
    options: Options = {},
  ): LiteralOutput<TId, "Text", Port.Variants.Text, string> {
    return {
      ...buildBase(id, displayName, options),
      variant: "Text",
    };
  }

  export function LanguageModel<TId extends string>(
    id: TId,
    displayName: string,
    options: Options = {},
  ): LiteralOutput<
    TId,
    "LanguageModel",
    Port.Variants.LanguageModel,
    LC.BaseChatModel
  > {
    return {
      ...buildBase(id, displayName, options),
      variant: "LanguageModel",
    };
  }

  export function Document<TId extends string>(
    id: TId,
    displayName: string,
    options: Options = {},
  ): LiteralOutput<TId, "Document", Port.Variants.Document, LC.Document> {
    return {
      ...buildBase(id, displayName, options),
      variant: "Document",
    };
  }

  export function Retriever<TId extends string>(
    id: TId,
    displayName: string,
    options: Options = {},
  ): LiteralOutput<
    TId,
    "Retriever",
    Port.Variants.Retriever,
    LC.BaseRetriever
  > {
    return {
      ...buildBase(id, displayName, options),
      variant: "Retriever",
    };
  }

  export function Embeddings<TId extends string>(
    id: TId,
    displayName: string,
    options: Options = {},
  ): LiteralOutput<TId, "Embeddings", Port.Variants.Embeddings, LC.Embeddings> {
    return {
      ...buildBase(id, displayName, options),
      variant: "Embeddings",
    };
  }

  export function VectorStore<TId extends string>(
    id: TId,
    displayName: string,
    options: Options = {},
  ): LiteralOutput<
    TId,
    "VectorStore",
    Port.Variants.VectorStore,
    LC.VectorStore
  > {
    return {
      ...buildBase(id, displayName, options),
      variant: "VectorStore",
    };
  }

  export function Tool<TId extends string>(
    id: TId,
    displayName: string,
    options: Options = {},
  ): LiteralOutput<TId, "Tool", Port.Variants.Tool, LC.Tool> {
    return {
      ...buildBase(id, displayName, options),
      variant: "Tool",
    };
  }

  export function ToolList<TId extends string>(
    id: TId,
    displayName: string,
    options: Options = {},
  ): LiteralOutput<TId, "ToolList", Port.Variants.ToolList, LC.Tool[]> {
    return {
      ...buildBase(id, displayName, options),
      variant: "ToolList",
    };
  }



  export function DataFrame<TId extends string>(
    id: TId,
    displayName: string,
    options: Options = {},
  ): LiteralOutput<TId, "DataFrame", Port.Variants.DataFrame, any> {
    return {
      ...buildBase(id, displayName, options),
      variant: "DataFrame",
    };
  }

  export function MessageList<TId extends string>(
    id: TId,
    displayName: string,
    options: Options = {},
  ): LiteralOutput<
    TId,
    "MessageList",
    Port.Variants.MessageList,
    LC.BaseMessage[]
  > {
    return {
      ...buildBase(id, displayName, options),
      variant: "MessageList",
    };
  }

  export function Data<TId extends string>(
    id: TId,
    displayName: string,
    options: Options = {},
  ): LiteralOutput<TId, "Data", Port.Variants.Data, any> {
    return {
      ...buildBase(id, displayName, options),
      variant: "Data",
    };
  }

  export function DataList<TId extends string>(
    id: TId,
    displayName: string,
    options: Options = {},
  ): LiteralOutput<TId, "DataList", Port.Variants.DataList, any[]> {
    return {
      ...buildBase(id, displayName, options),
      variant: "DataList",
    };
  }

  export function Unresolved<
    TId extends string,
    TPolymorphicGroup extends string,
  >(
    id: TId,
    displayName: string,
    options: { polymorphicGroupId: TPolymorphicGroup } & Options,
  ): LiteralOutput<TId, "Unresolved", Port.Variants.Unresolved, any> & {
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
  >(
    id: TId,
    displayName: string,
    options: { polymorphicGroupId: TPolymorphicGroup } & Options,
  ): LiteralOutput<
    TId,
    "UnresolvedScalar",
    Port.Variants.UnresolvedScalar,
    any
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
  >(
    id: TId,
    displayName: string,
    options: { polymorphicGroupId: TPolymorphicGroup } & Options,
  ): LiteralOutput<TId, "UnresolvedList", Port.Variants.UnresolvedList, any> & {
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
