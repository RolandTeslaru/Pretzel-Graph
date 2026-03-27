import { z } from "zod"

export namespace Foundations {
    export const ArtifactId = z.string().brand("ArtifactId")
    export type ArtifactId = z.infer<typeof ArtifactId>



    export namespace Field {
        export const Id = z.string().brand("FieldId");
        export type Id = z.infer<typeof Id>;

        export const Value = z.union([
            z.string(),
            z.number(),
            z.boolean(),
            z.array(z.string()),
            z.array(z.number()),
            z.array(z.boolean()),
            z.record(z.string(), z.any()),
        ]);
        export type Value = z.infer<typeof Value>

        export const Base = z.object({
            id: Field.Id,
            advanced: z.boolean(),
            required: z.boolean(),
            reconcile: z.boolean(),

            displayName: z.string(),
            description: z.string().optional(),
            tooltip: z.string().optional(),
        })
        export type Base = z.infer<typeof Base>

        export const Variant = z.enum([
            "Integer",
            "Float",
            "String",
            "Secret",
            "Boolean",
            "MultiOption",
            "File",
            "Script",
            "Json",
            "List"
        ])
        export type Variant = z.infer<typeof Variant>

        function configLiteral<T extends Field.Variant>(value: T) {
            return z.literal(value);
        }

        export const Integer = Field.Base.extend({
            variant: configLiteral("Integer"),
            initialValue: z.int(),
            min: z.int().optional(),
            max: z.int().optional(),
            step: z.int().optional(),
            slider: z.boolean().optional(),
        })

        export const Float = Field.Base.extend({
            variant: configLiteral("Float"),
            initialValue: z.number(),
            min: z.number().optional(),
            max: z.number().optional(),
            step: z.number().optional(),
            slider: z.boolean().optional(),
        })

        export const String = Field.Base.extend({
            variant: configLiteral("String"),
            initialValue: z.string(),
            multiline: z.boolean(),
            placeholder: z.string().optional(),
        })

        export const Secret = Field.Base.extend({
            variant: configLiteral("Secret"),
            initialValue: z.string(),
        })

        export const Boolean = Field.Base.extend({
            variant: configLiteral("Boolean"),
            initialValue: z.boolean(),
        })

        export const MultiOption = Field.Base.extend({
            variant: configLiteral("MultiOption"),
            initialValue: z.string(),
            placeholder: z.string().optional(),
            options: z.array(z.string()),
            kind: z.enum(["select", "tab"]).default("select"),
        })

        export const File = Field.Base.extend({
            variant: configLiteral("File"),
            initialValue: z.string(),
            fileTypes: z.array(z.string()).optional(),
        })

        export const Script = Field.Base.extend({
            variant: configLiteral("Script"),
            initialValue: z.string(),
        })

        export const Json = Field.Base.extend({
            variant: configLiteral("Json"),
            initialValue: z.json(),
        })

        export const List = Field.Base.extend({
            variant: configLiteral("List"),
            initialValue: z.array(z.string()),
        })

        export interface Integer extends z.infer<typeof Integer> { }
        export interface Float extends z.infer<typeof Float> { }
        export interface String extends z.infer<typeof String> { }
        export interface Secret extends z.infer<typeof Secret> { }
        export interface Boolean extends z.infer<typeof Boolean> { }
        export interface MultiOption extends z.infer<typeof MultiOption> { }
        export interface File extends z.infer<typeof File> { }
        export interface Script extends z.infer<typeof Script> { }
        export interface Json extends z.infer<typeof Json> { }
        export interface List extends z.infer<typeof List> { }

        export const Schema = z.discriminatedUnion("variant", [
            Integer,
            Float,
            String,
            Secret,
            Boolean,
            MultiOption,
            File,
            Script,
            Json,
            List,
        ]);

        export type Schema = z.infer<typeof Schema>;
    }
    export type Field = z.infer<typeof Field.Schema>;



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
            "DataFrame",
            "Integer",
            "Json",
            "Unresolved",
            "UnresolvedList",
        ])
        export type Variant = z.infer<typeof Variant>

        export const Id = z.string().brand("PortId")
        export type Id = z.infer<typeof Port.Id>

        function portLiteral<T extends Port.Variant>(value: T) {
            return z.literal(value);
        }

        export const Base = z.object({
            id: z.string(),

            displayName: z.string().optional(),
            tooltip: z.string().optional(),
            isDynamic: z.boolean().optional(),
            syncGroupId: z.string().optional(),
            // For dynamic ports: stores the original blueprint variant ("Unresolved" or "UnresolvedList")
            // so that unresolveDynamicPortGroup can restore the correct unresolved state after disconnection.
            unresolvedVariant: z.enum(["Unresolved", "UnresolvedList"]).optional(),
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
            })

            export const UnresolvedList = Base.extend({
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
                DataFrame,
                Integer,
                Json,
                Unresolved,
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
            export type DataFrame = z.infer<typeof DataFrame>
            export type Integer = z.infer<typeof Integer>
            export type Json = z.infer<typeof Json>
            export type Unresolved = z.infer<typeof Unresolved>
            export type UnresolvedList = z.infer<typeof UnresolvedList>
        }

        export namespace Input {
            export const Id = Port.Id.brand("InputId");
            export type Id = z.infer<typeof Input.Id>;

            const inputFields = {
                id: Input.Id,
                required: z.boolean(),
                internal: z.boolean().optional()
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
            export const Integer = Port.Variants.Integer.extend(inputFields);

            export const Json = Port.Variants.Json.extend(inputFields);
            export const Unresolved = Port.Variants.Unresolved.extend(inputFields);
            export const UnresolvedList = Port.Variants.UnresolvedList.extend(inputFields);

            export const Schema = z.discriminatedUnion("variant", [
                Message, MessageList, Data, DataList, Text, LanguageModel, Document, Retriever,
                Embeddings, VectorStore, Tool, Integer, Json, Unresolved, UnresolvedList
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
            export const DataFrame = Port.Variants.DataFrame.extend(outputFields);
            export const Integer = Port.Variants.Integer.extend(outputFields);
            export const Json = Port.Variants.Json.extend(outputFields);
            export const Unresolved = Port.Variants.Unresolved.extend(outputFields);
            export const UnresolvedList = Port.Variants.UnresolvedList.extend(outputFields);

            export const Schema = z.discriminatedUnion("variant", [
                Message, MessageList, Data, DataList, Text, LanguageModel, Document, Retriever, Embeddings,
                VectorStore, Tool, DataFrame, Integer, Json, Unresolved, UnresolvedList
            ]);
        }
        export type Output = z.infer<typeof Output.Schema>
    }


    // ============================================
    // BLUEPRINT
    // ============================================

    export namespace Blueprint {
        export const Id = z.string().brand("BlueprintId")
        export type Id = z.infer<typeof Id>

        export namespace Meta {
            export const Schema = z.object({
                id: Blueprint.Id,
                displayName: z.string(),
                icon: z.string(),
                accent: z.string().optional()
            })
        }
        export type Meta = z.infer<typeof Meta.Schema>

        export const Schema = Meta.Schema.extend({
            fields: z.array(Foundations.Field.Schema).readonly(),
            inputs: z.array(Port.Input.Schema).readonly(),
            outputs: z.array(Port.Output.Schema).readonly(),
            description: z.string(),
        }).readonly()
    }

    export type Blueprint = z.infer<typeof Blueprint.Schema>
}


