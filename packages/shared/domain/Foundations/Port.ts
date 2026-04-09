import { z } from "zod"

export namespace Port {
    export const Variant = z.enum([
        "Message",
        "MessageList",
        "Document",
        "Text",
        "Data",
        "DataList",
        "LanguageModel",
        "Embeddings",
        "VectorStore",
        "Retriever",
        "Tool",
        "ToolList",
        "DataFrame",
        "Integer",
        "Json",
        "Unresolved",
        "UnresolvedScalar",
        "UnresolvedList",
    ])
    export type Variant = z.infer<typeof Variant>

    export const Id = z.string().brand("PortId")
    export type Id = z.infer<typeof Port.Id>

    function portLiteral<T extends Port.Variant>(value: T) {
        return z.literal(value);
    }

    export const Base = z.object({
        id: Port.Id,

        displayName: z.string().optional(),
        tooltip: z.string().optional(),
        syncGroupId: z.string().optional(),
        internal: z.boolean().optional(),
    })
    export interface Base extends z.infer<typeof Base> { }

    export namespace Variants {
        export const Message = Base.extend({
            variant: portLiteral("Message"),
            initialValue: z.string().optional(),
            placeholder: z.string().optional(),
        })

        export const MessageList = Base.extend({
            variant: portLiteral("MessageList"),
            initialValue: z.array(z.string()).optional(),
        })

        export const Data = Base.extend({
            variant: portLiteral("Data"),
            initialValue: z.any().optional(),
        })

        export const DataList = Base.extend({
            variant: portLiteral("DataList"),
            initialValue: z.array(z.any()).optional(),
        })

        export const Text = Base.extend({
            variant: portLiteral("Text"),
            initialValue: z.string().optional(),
        })

        export const LanguageModel = Base.extend({
            variant: portLiteral("LanguageModel"),
        })

        export const Document = Base.extend({
            variant: portLiteral("Document"),
        })

        export const Retriever = Base.extend({
            variant: portLiteral("Retriever"),
        })

        export const Embeddings = Base.extend({
            variant: portLiteral("Embeddings"),
        })

        export const VectorStore = Base.extend({
            variant: portLiteral("VectorStore"),
        })

        export const Tool = Base.extend({
            variant: portLiteral("Tool"),
        })

        export const ToolList = Base.extend({
            variant: portLiteral("ToolList"),
        })

        export const DataFrame = Base.extend({
            variant: portLiteral("DataFrame"),
        })

        export const Integer = Base.extend({
            variant: portLiteral("Integer"),
        })

        export const Json = Base.extend({
            variant: portLiteral("Json"),
        })

        export const Unresolved = Base.extend({
            variant: portLiteral("Unresolved"),
            originalVariant: z.enum(["Unresolved", "UnresolvedScalar", "UnresolvedList"]),
        })

        export const UnresolvedScalar = Unresolved.extend({
            variant: portLiteral("UnresolvedScalar"),
        })

        export const UnresolvedList = Unresolved.extend({
            variant: portLiteral("UnresolvedList"),
        })

        export const Schema = z.discriminatedUnion("variant", [
            Message,
            MessageList,
            Data,
            DataList,
            Text,
            LanguageModel,
            Document,
            Retriever,
            Embeddings,
            VectorStore,
            Tool,
            ToolList,
            DataFrame,
            Integer,
            Json,
            Unresolved,
            UnresolvedScalar,
            UnresolvedList,
        ])

        export type Message = z.infer<typeof Message>
        export type MessageList = z.infer<typeof MessageList>
        export type Data = z.infer<typeof Data>
        export type DataList = z.infer<typeof DataList>
        export type Text = z.infer<typeof Text>
        export type LanguageModel = z.infer<typeof LanguageModel>
        export type Document = z.infer<typeof Document>
        export type Retriever = z.infer<typeof Retriever>
        export type Embeddings = z.infer<typeof Embeddings>
        export type VectorStore = z.infer<typeof VectorStore>
        export type Tool = z.infer<typeof Tool>
        export type ToolList = z.infer<typeof ToolList>
        export type DataFrame = z.infer<typeof DataFrame>
        export type Integer = z.infer<typeof Integer>
        export type Json = z.infer<typeof Json>
        export type Unresolved = z.infer<typeof Unresolved>
        export type UnresolvedScalar = z.infer<typeof UnresolvedScalar>
        export type UnresolvedList = z.infer<typeof UnresolvedList>
        export type UnresolvedLike = Unresolved | UnresolvedScalar | UnresolvedList
    }

    export namespace Input {
        export const Id = Port.Id.brand("InputId");
        export type Id = z.infer<typeof Input.Id>;

        const inputFields = {
            id: Input.Id,
            required: z.boolean(),
        };

        export const Base = Port.Base.extend(inputFields)
        export type Base = z.infer<typeof Base>

        // Variant-specific input schemas (variant fields + InputId + required)
        export const Message = Port.Variants.Message.extend(inputFields);
        export const MessageList = Port.Variants.MessageList.extend(inputFields);
        export const Data = Port.Variants.Data.extend(inputFields);
        export const DataList = Port.Variants.DataList.extend(inputFields);
        export const Text = Port.Variants.Text.extend(inputFields);
        export const LanguageModel = Port.Variants.LanguageModel.extend(inputFields);
        export const Document = Port.Variants.Document.extend(inputFields);
        export const Retriever = Port.Variants.Retriever.extend(inputFields);
        export const Embeddings = Port.Variants.Embeddings.extend(inputFields);
        export const VectorStore = Port.Variants.VectorStore.extend(inputFields);
        export const Tool = Port.Variants.Tool.extend(inputFields);
        export const ToolList = Port.Variants.ToolList.extend(inputFields);
        export const Integer = Port.Variants.Integer.extend(inputFields);

        export const Json = Port.Variants.Json.extend(inputFields);
        export const Unresolved = Port.Variants.Unresolved.extend(inputFields);
        export const UnresolvedScalar = Port.Variants.UnresolvedScalar.extend(inputFields);
        export const UnresolvedList = Port.Variants.UnresolvedList.extend(inputFields);

        export const Schema = z.discriminatedUnion("variant", [
            Message, MessageList, Data, DataList, Text, LanguageModel, Document, Retriever,
            Embeddings, VectorStore, Tool, ToolList, Integer, Json, Unresolved, UnresolvedScalar, UnresolvedList
        ]);
    }
    export type Input = z.infer<typeof Input.Schema>

    export namespace Output {
        export const Id = Port.Id.brand("OutputId");
        export type Id = z.infer<typeof Id>;

        const outputFields = {
            id: Output.Id
        };

        export const Base = Port.Base.extend(outputFields)
        export type Base = z.infer<typeof Base>

        // Variant-specific output schemas (variant fields + OutputId)
        export const Message = Port.Variants.Message.extend(outputFields);
        export const MessageList = Port.Variants.MessageList.extend(outputFields);
        export const Data = Port.Variants.Data.extend(outputFields);
        export const DataList = Port.Variants.DataList.extend(outputFields);
        export const Text = Port.Variants.Text.extend(outputFields);
        export const LanguageModel = Port.Variants.LanguageModel.extend(outputFields);
        export const Document = Port.Variants.Document.extend(outputFields);
        export const Retriever = Port.Variants.Retriever.extend(outputFields);
        export const Embeddings = Port.Variants.Embeddings.extend(outputFields);
        export const VectorStore = Port.Variants.VectorStore.extend(outputFields);
        export const Tool = Port.Variants.Tool.extend(outputFields);
        export const ToolList = Port.Variants.ToolList.extend(outputFields);
        export const DataFrame = Port.Variants.DataFrame.extend(outputFields);
        export const Integer = Port.Variants.Integer.extend(outputFields);
        export const Json = Port.Variants.Json.extend(outputFields);
        export const Unresolved = Port.Variants.Unresolved.extend(outputFields);

        export const UnresolvedScalar = Port.Variants.UnresolvedScalar.extend(outputFields);
        export const UnresolvedList = Port.Variants.UnresolvedList.extend(outputFields);

        export const Schema = z.discriminatedUnion("variant", [
            Message, MessageList, Data, DataList, Text, LanguageModel, Document, Retriever, Embeddings,
            VectorStore, Tool, ToolList, DataFrame, Integer, Json, Unresolved, UnresolvedScalar, UnresolvedList
        ]);
    }
    export type Output = z.infer<typeof Output.Schema>

    export const UNRESOLVED_LIKE_VARIANTS = new Set<Port.Variant>(
        ["Unresolved", "UnresolvedScalar", "UnresolvedList"] satisfies Port.Variant[]
    );

    export const LIST_VARIANTS = new Set<Port.Variant>(
        ["MessageList", "DataList", "ToolList"] satisfies Port.Variant[]
    );

    export const SCALAR_VARIANTS = new Set<Port.Variant>(
        ["Message", "Data", "Tool"] satisfies Port.Variant[]
    );

    export function isUnresolvedLike(variant: Port.Variant): boolean {
        return UNRESOLVED_LIKE_VARIANTS.has(variant);
    }

    export function isListLike(variant: Port.Variant): boolean {
        return LIST_VARIANTS.has(variant);
    }

    export function isScalarLike(variant: Port.Variant): boolean {
        return SCALAR_VARIANTS.has(variant);
    }

    export function isPolymorphic(port: Input | Output | null): boolean {
        return !!port && "originalVariant" in port && port.originalVariant !== undefined;
    }

    const _LIST_PROMOTION_MAP = {
        Message: "MessageList",
        Data: "DataList",
        Tool: "ToolList",
    } as const satisfies Partial<Record<Port.Variant, Port.Variant>>

    const _LIST_DEMOTION_MAP = {
        MessageList: "Message",
        DataList: "Data",
        ToolList: "Tool",
    } as const satisfies Partial<Record<Port.Variant, Port.Variant>>

    export const LIST_PROMOTION_MAP: Partial<Record<Port.Variant, Port.Variant>> = _LIST_PROMOTION_MAP;
    export const LIST_DEMOTION_MAP: Partial<Record<Port.Variant, Port.Variant>> = _LIST_DEMOTION_MAP;

    export function promoteToList(variant: Port.Variant): Port.Variant | undefined {
        return LIST_PROMOTION_MAP[variant];
    }

    export function demoteToScalar(variant: Port.Variant): Port.Variant | undefined {
        return LIST_DEMOTION_MAP[variant];
    }
}

export type Port = Port.Input | Port.Output