import { z } from "zod"
import { evaluateRule as _evaluateRule, evaluateRuleGroup as _evaluateRuleGroup, evaluateCondition as _evaluateCondition } from "../utils";
export namespace Foundations {
    export const ArtifactId = z.string().brand("ArtifactId")
    export type ArtifactId = z.infer<typeof ArtifactId>



    export namespace Field {
        export const Id = z.string().brand("FieldId");
        export type Id = z.infer<typeof Id>;

        export const Value = z.json();
        export type Value = z.infer<typeof Value>

        export const Base = z.object({
            id: Field.Id,
            advanced: z.boolean(),
            required: z.boolean(),
            reconcile: z.boolean(),
            hidden: z.boolean().optional(),

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
            "List",
            "Condition",
            "CaseList",
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

        export namespace Condition {

            export const DataType = z.enum(["string", "number", "dateTime", "boolean", "array", "object"])
            export type DataType = z.infer<typeof DataType>

            export namespace Operator {
                export const shared = ["exists", "not_exists", "is_empty", "is_not_empty"] as const

                export const String = z.enum([
                    ...shared,
                    "equals", "not_equals",
                    "contains", "not_contains",
                    "starts_with", "not_starts_with",
                    "ends_with", "not_ends_with",
                    "matches_regex", "not_matches_regex",
                ])

                export const Number = z.enum([
                    ...shared,
                    "equals", "not_equals",
                    "greater_than", "less_than",
                    "greater_than_or_equal", "less_than_or_equal",
                ])

                export const DateTime = z.enum([
                    ...shared,
                    "equals", "not_equals",
                    "after", "before",
                    "after_or_equal", "before_or_equal",
                ])

                export const Boolean = z.enum([
                    ...shared,
                    "is_true", "is_false",
                    "equals", "not_equals",
                ])

                export const Array = z.enum([
                    ...shared,
                    "contains", "not_contains",
                    "length_equals", "length_not_equals",
                    "length_greater_than", "length_less_than",
                    "length_greater_than_or_equal", "length_less_than_or_equal",
                ])

                export const Object = z.enum([
                    ...shared,
                ])

                export type String = z.infer<typeof String>
                export type Number = z.infer<typeof Number>
                export type DateTime = z.infer<typeof DateTime>
                export type Boolean = z.infer<typeof Boolean>
                export type Array = z.infer<typeof Array>
                export type Object = z.infer<typeof Object>

                export const Unary = z.enum([
                    ...shared,
                    "is_true", "is_false",
                ])
                export type Unary = z.infer<typeof Unary>

                export const Schema = z.union([String, Number, DateTime, Boolean, Array, Object])

                export const MAP = {
                    string: String,
                    number: Number,
                    dateTime: DateTime,
                    boolean: Boolean,
                    array: Array,
                    object: Object,
                } as const satisfies Record<Condition.DataType, z.ZodEnum<any>>
            }
            export type Operator = z.infer<typeof Operator.Schema>


            export namespace Rule {
                export const Id = z.string().brand("RuleId")
                export type Id = z.infer<typeof Id>
                export const createId = (id?: string) => Id.parse( id || crypto.randomUUID())

                const Base = z.object({
                    id: Id,
                    leftOperand: z.string(),
                    rightOperand: z.string().optional(),
                })

                export const String   = Base.extend({ dataType: z.literal("string"),   operator: Operator.String })
                export const Number   = Base.extend({ dataType: z.literal("number"),   operator: Operator.Number })
                export const DateTime = Base.extend({ dataType: z.literal("dateTime"), operator: Operator.DateTime })
                export const Boolean  = Base.extend({ dataType: z.literal("boolean"),  operator: Operator.Boolean })
                export const Array    = Base.extend({ dataType: z.literal("array"),    operator: Operator.Array })
                export const Object   = Base.extend({ dataType: z.literal("object"),   operator: Operator.Object })

                export type String   = z.infer<typeof String>
                export type Number   = z.infer<typeof Number>
                export type DateTime = z.infer<typeof DateTime>
                export type Boolean  = z.infer<typeof Boolean>
                export type Array    = z.infer<typeof Array>
                export type Object   = z.infer<typeof Object>

                export const Schema = z.discriminatedUnion("dataType", [
                    String, Number, DateTime, Boolean, Array, Object,
                ])
            }
            export type Rule = z.infer<typeof Rule.Schema>

            export namespace RuleGroup {
                export const Id = z.string().brand("RuleGroupId")
                export type Id = z.infer<typeof Id>
                export const createId = (id?: string) => Id.parse( id || crypto.randomUUID())

                export const Schema = z.object({
                    id: Id,
                    combinator: z.enum(["AND", "OR"]),
                    children: z.array(z.union([Rule.Id, RuleGroup.Id])),
                })
            }
            export type RuleGroup = z.infer<typeof RuleGroup.Schema>

            export const Value = z.object({
                rootId: RuleGroup.Id,
                rules: z.record(Rule.Id, Rule.Schema),
                groups: z.record(RuleGroup.Id, RuleGroup.Schema),
            })
            export type Value = z.infer<typeof Value>

            export const Schema = Field.Base.extend({
                variant: configLiteral("Condition"),
                initialValue: Value,
            });


            export const evaluateRule = _evaluateRule;
            export const evaluateRuleGroup = _evaluateRuleGroup;
            export const evaluate = _evaluateCondition;
        }

        export namespace CaseList {
            export const Entry = z.object({
                portId: z.string().brand("PortId").brand("OutputId"),
                label: z.string(),
                condition: Condition.Value,
            });
            export type Entry = z.infer<typeof Entry>;

            export const Value = z.array(Entry);
            export type Value = z.infer<typeof Value>;

            export const Schema = Field.Base.extend({
                variant: configLiteral("CaseList"),
                initialValue: Value,
            });

            export const createEntry = (portId: string, label: string): Entry => {
                const rootId = Condition.RuleGroup.createId("root");
                return {
                    portId: portId as Entry["portId"],
                    label,
                    condition: {
                        rootId,
                        rules: {
                            [Condition.Rule.createId("rule1")]: {
                                id: Condition.Rule.createId("rule1"),
                                dataType: "string",
                                leftOperand: "",
                                operator: "equals",
                                rightOperand: "",
                            },
                        } as Condition.Value["rules"],
                        groups: {
                            [rootId]: { id: rootId, combinator: "AND", children: [Condition.Rule.createId("rule1")] },
                        } as Condition.Value["groups"],
                    },
                };
            };
        }

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
        export interface Condition extends z.infer<typeof Condition.Schema> { }
        export interface CaseList extends z.infer<typeof CaseList.Schema> { }

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
            Condition.Schema,
            CaseList.Schema,
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
            "ToolList",
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
            id: Port.Id,

            displayName: z.string().optional(),
            tooltip: z.string().optional(),
            isDynamic: z.boolean().optional(),
            syncGroupId: z.string().optional(),
            internal: z.boolean().optional(),
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
                ToolList,
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
            export type ToolList = z.infer<typeof ToolList>
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
            export const UnresolvedList = Port.Variants.UnresolvedList.extend(inputFields);

            export const Schema = z.discriminatedUnion("variant", [
                Message, MessageList, Data, DataList, Text, LanguageModel, Document, Retriever,
                Embeddings, VectorStore, Tool, ToolList, Integer, Json, Unresolved, UnresolvedList
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
            export const UnresolvedList = Port.Variants.UnresolvedList.extend(outputFields);

            export const Schema = z.discriminatedUnion("variant", [
                Message, MessageList, Data, DataList, Text, LanguageModel, Document, Retriever, Embeddings,
                VectorStore, Tool, ToolList, DataFrame, Integer, Json, Unresolved, UnresolvedList
            ]);
        }
        export type Output = z.infer<typeof Output.Schema>
    }


    // ============================================
    // PROJECTIONS
    // ============================================
    // Plain-object shapes projected from LC class instances.
    // Used for frontend data preview and routing expression evaluation.
    // The projected shape matches instance property access paths,
    // NOT the LC serialization format.

    export namespace Projection {

        export const Message = z.object({
            type:              z.string(),
            content:           z.union([z.string(), z.array(z.record(z.string(), z.any()))]),
            name:              z.string().optional(),
            id:                z.string().optional(),
            additional_kwargs: z.record(z.string(), z.any()),
            response_metadata: z.record(z.string(), z.any()),
            tool_calls:        z.array(z.record(z.string(), z.any())).optional(),
            invalid_tool_calls:z.array(z.record(z.string(), z.any())).optional(),
            usage_metadata:    z.record(z.string(), z.any()).optional(),
            tool_call_id:      z.string().optional(),
        })
        export type Message = z.infer<typeof Message>

        export const MessageList = z.array(Message)
        export type MessageList = z.infer<typeof MessageList>

        export const Retriever = z.object({
        })
        export type Retriever = z.infer<typeof Retriever>

        export const Document = z.object({
            pageContent: z.string(),
            metadata:    z.record(z.string(), z.any()),
        })
        export type Document = z.infer<typeof Document>

        export const Tool = z.object({
            name:        z.string(),
            description: z.string(),
            returnDirect: z.boolean(),
        })
        export type Tool = z.infer<typeof Tool>

        export const ToolList = z.array(Tool)
        export type ToolList = z.infer<typeof ToolList>

        export const LanguageModel = z.object({
            type:             z.string(),
            model:            z.string(),
            temperature:      z.number().optional(),
            streaming:        z.boolean().optional(),
            topP:             z.number().optional(),
            topK:             z.number().optional(),
            maxTokens:        z.number().optional(),
            maxOutputTokens:  z.number().optional(),
            stop:             z.array(z.string()).optional(),
            stopSequences:    z.array(z.string()).optional(),
            frequencyPenalty: z.number().optional(),
            presencePenalty:  z.number().optional(),
            n:                z.number().optional(),
            modelKwargs:      z.record(z.string(), z.any()).optional(),
        })
        export type LanguageModel = z.infer<typeof LanguageModel>

        export const Embeddings = z.object({
            model:         z.string(),
            dimensions:    z.number().optional(),
            batchSize:     z.number().optional(),
            stripNewLines: z.boolean().optional(),
            maxBatchSize:  z.number().optional(),
        })
        export type Embeddings = z.infer<typeof Embeddings>

        export const Schema = z.union([
            Message,
            MessageList,
            Retriever,
            Document,
            Tool,
            ToolList,
            LanguageModel,
            Embeddings,
        ])
    }
    export type Projection = z.infer<typeof Projection.Schema>


    // ============================================
    // BLUEPRINT
    // ============================================

    export namespace Blueprint {
        export const Id = z.string().brand("BlueprintId")
        export type Id = z.infer<typeof Id>

        export const ReconciledId = z.string().brand("ReconciledBlueprintId")
        export type ReconciledId = z.infer<typeof ReconciledId>

        export const createReconciledId = (
            blueprintId: Blueprint.Id,
            fields: Foundations.Field[] | Readonly<Foundations.Field[]>,
            values: Record<Foundations.Field.Id, Foundations.Field.Value>,
            anticipate?: Partial<Record<Foundations.Field.Id, Foundations.Field.Value>>
        ): Blueprint.ReconciledId => {
            const parts = fields
                .filter(f => f.reconcile)
                .map(f => `${f.id}=${String(anticipate?.[f.id] ?? values[f.id] ?? f.initialValue)}`)
                .sort()
                .join(",");

            return `${blueprintId}:${parts}` as Blueprint.ReconciledId;
        }

        export namespace Meta {
            export const Schema = z.object({
                id: Blueprint.Id,
                displayName: z.string(),
                icon: z.string(),
                accent: z.string().optional(),
                toolCompatible: z.boolean(),
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

