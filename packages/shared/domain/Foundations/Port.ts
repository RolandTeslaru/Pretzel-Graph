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
        "Unresolved",
        "UnresolvedScalar",
        "UnresolvedList",
    ])
    export type Variant = z.infer<typeof Variant>
    export type UnresolvedVariant = Extract<Variant, "Unresolved" | "UnresolvedScalar" | "UnresolvedList">
    export type ResolvedVariant = Exclude<Variant, UnresolvedVariant>

    export const Id = z.string().brand("PortId")
    export type Id = z.infer<typeof Port.Id>

    function portLiteral<T extends Port.Variant>(value: T) {
        return z.literal(value);
    }

    export const PolymorphicGroupId = z.string().brand("PolymorphicGroupId")
    export type PolymorphicGroupId = z.infer<typeof PolymorphicGroupId>

    export const GroupId = z.string().brand("GroupId")
    export type GroupId = z.infer<typeof GroupId>

    export const Base = z.object({
        id: Port.Id,

        displayName:   z.string().optional(),
        tooltip:       z.string().optional(),
        internal:      z.boolean().optional(),
        isAddedByUser: z.boolean().optional(),
    
        polymorphicGroupId: PolymorphicGroupId.optional(),
        groupId:            GroupId.optional(),
    })
    export interface Base extends z.infer<typeof Base> { }

    export namespace Variants {
        export const Message = Base.extend({
            variant: portLiteral("Message"),
            initialValue: z.string().optional(),
            placeholder: z.string().optional(),
        })
        export type Message = z.infer<typeof Message>

        export const MessageList = Base.extend({
            variant: portLiteral("MessageList"),
            initialValue: z.array(z.string()).optional(),
        })
        export type MessageList = z.infer<typeof MessageList>

        export const Data = Base.extend({
            variant: portLiteral("Data"),
            initialValue: z.any().optional(),
        })
        export type Data = z.infer<typeof Data>

        export const DataList = Base.extend({
            variant: portLiteral("DataList"),
            initialValue: z.array(z.any()).optional(),
        })
        export type DataList = z.infer<typeof DataList>

        export const Text = Base.extend({
            variant: portLiteral("Text"),
            initialValue: z.string().optional(),
        })
        export type Text = z.infer<typeof Text>

        export const LanguageModel = Base.extend({
            variant: portLiteral("LanguageModel"),
        })
        export type LanguageModel = z.infer<typeof LanguageModel>

        export const Document = Base.extend({
            variant: portLiteral("Document"),
        })
        export type Document = z.infer<typeof Document>

        export const Retriever = Base.extend({
            variant: portLiteral("Retriever"),
        })
        export type Retriever = z.infer<typeof Retriever>

        export const Embeddings = Base.extend({
            variant: portLiteral("Embeddings"),
        })
        export type Embeddings = z.infer<typeof Embeddings>

        export const VectorStore = Base.extend({
            variant: portLiteral("VectorStore"),
        })
        export type VectorStore = z.infer<typeof VectorStore>

        export const Tool = Base.extend({
            variant: portLiteral("Tool"),
        })
        export type Tool = z.infer<typeof Tool>

        export const ToolList = Base.extend({
            variant: portLiteral("ToolList"),
        })
        export type ToolList = z.infer<typeof ToolList>

        export const DataFrame = Base.extend({
            variant: portLiteral("DataFrame"),
        })
        export type DataFrame = z.infer<typeof DataFrame>

        export const Unresolved = Base.extend({
            variant: portLiteral("Unresolved"),
        })
        export type Unresolved = z.infer<typeof Unresolved>

        export const UnresolvedScalar = Unresolved.extend({
            variant: portLiteral("UnresolvedScalar"),
        })
        export type UnresolvedScalar = z.infer<typeof UnresolvedScalar>

        export const UnresolvedList = Unresolved.extend({
            variant: portLiteral("UnresolvedList"),
        })
        export type UnresolvedList = z.infer<typeof UnresolvedList>
        export type UnresolvedLike = Unresolved | UnresolvedScalar | UnresolvedList

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
            Unresolved,
            UnresolvedScalar,
            UnresolvedList,
        ])
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

        export const Schema = z.discriminatedUnion("variant", [
            Port.Variants.Message.extend(inputFields),
            Port.Variants.MessageList.extend(inputFields),
            Port.Variants.Data.extend(inputFields),
            Port.Variants.DataList.extend(inputFields),
            Port.Variants.Text.extend(inputFields),
            Port.Variants.LanguageModel.extend(inputFields),
            Port.Variants.Document.extend(inputFields),
            Port.Variants.Retriever.extend(inputFields),
            Port.Variants.Embeddings.extend(inputFields),
            Port.Variants.VectorStore.extend(inputFields),
            Port.Variants.Tool.extend(inputFields),
            Port.Variants.ToolList.extend(inputFields),
            Port.Variants.DataFrame.extend(inputFields),
            Port.Variants.Unresolved.extend(inputFields),
            Port.Variants.UnresolvedScalar.extend(inputFields),
            Port.Variants.UnresolvedList.extend(inputFields),
        ])
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

        export const Schema = z.discriminatedUnion("variant", [
            Port.Variants.Message.extend(outputFields),
            Port.Variants.MessageList.extend(outputFields),
            Port.Variants.Data.extend(outputFields),
            Port.Variants.DataList.extend(outputFields),
            Port.Variants.Text.extend(outputFields),
            Port.Variants.LanguageModel.extend(outputFields),
            Port.Variants.Document.extend(outputFields),
            Port.Variants.Retriever.extend(outputFields),
            Port.Variants.Embeddings.extend(outputFields),
            Port.Variants.VectorStore.extend(outputFields),
            Port.Variants.Tool.extend(outputFields),
            Port.Variants.ToolList.extend(outputFields),
            Port.Variants.DataFrame.extend(outputFields),
            Port.Variants.Unresolved.extend(outputFields),
            Port.Variants.UnresolvedScalar.extend(outputFields),
            Port.Variants.UnresolvedList.extend(outputFields),
        ])
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

    export function isUnresolvedLike(variant: Port.Variant): variant is Port.UnresolvedVariant {
        return UNRESOLVED_LIKE_VARIANTS.has(variant);
    }

    export function isResolvedLike(variant: Port.Variant): variant is Port.ResolvedVariant {
        return !UNRESOLVED_LIKE_VARIANTS.has(variant);
    }

    export function isListLike(variant: Port.Variant): boolean {
        return LIST_VARIANTS.has(variant);
    }

    export function isScalarLike(variant: Port.Variant): boolean {
        return SCALAR_VARIANTS.has(variant);
    }

    export function isPolymorphic(port: Input | Output | null): boolean {
        return !!port && "polymorphicGroupId" in port && port.polymorphicGroupId !== undefined;
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