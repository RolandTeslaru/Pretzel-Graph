import { z } from "zod"

export namespace Foundations {
    export const ArtifactId = z.string().brand("ArtifactId")
    export type ArtifactId = z.infer<typeof ArtifactId>

    export const HandleVariant = z.enum([
        "Message",
        "Document",
        "Text",
        "Data",
        "LanguageModel",
        "Embeddings",
        "VectorStore",
        "Retriever",
        "Tool",
        "DataFrame",
        "Structure"
    ])
    export type HandleVariant = z.infer<typeof HandleVariant>



    // ============================================
    // INPUTS
    // ============================================

    export namespace Input {
        export const Id = z.string().brand("InputId");
        export type Id = z.infer<typeof Id>;

        /**
         * Base schema shared by ALL inputs (fields and ports alike).
         */
        export const Base = z.object({
            id: Input.Id,
            required: z.boolean(),
            reconcile: z.boolean(),
            asTool: z.boolean(),
            advanced: z.boolean(),

            handleVariants: z.array(HandleVariant),

            uiData: z.object({
                displayName: z.string(),
                tooltip: z.string().optional(),
                placeholder: z.string().optional(),
            }),
        })
        export interface Base extends z.infer<typeof Base> { }


        // ---- Field inputs (user-configurable primitives) ----

        export namespace DerivedSchemas {
            export const Integer = Base.extend({
                variant: z.literal("integer"),
                initialValue: z.int(),
                min: z.int().optional(),
                max: z.int().optional(),
                step: z.int().optional(),
                slider: z.boolean().optional(),
            })

            export const Float = Base.extend({
                variant: z.literal("float"),
                initialValue: z.number(),
                min: z.number().optional(),
                max: z.number().optional(),
                step: z.number().optional(),
                slider: z.boolean().optional(),
            })

            export const String = Base.extend({
                variant: z.literal("string"),
                initialValue: z.string(),
                multiline: z.boolean(),
            })

            export const Secret = Base.extend({
                variant: z.literal("secret"),
                initialValue: z.string(),
            })

            export const Boolean = Base.extend({
                variant: z.literal("boolean"),
                initialValue: z.boolean(),
            })

            export const MultiOption = Base.extend({
                variant: z.literal("multiOption"),
                initialValue: z.string(),
                options: z.array(z.string()),
                kind: z.enum(["select", "tab"]).default("select"),
            })

            export const File = Base.extend({
                variant: z.literal("file"),
                initialValue: z.string(),
                fileTypes: z.array(z.string()).optional(),
            })

            export const Script = Base.extend({
                variant: z.literal("script"),
                initialValue: z.string(),
            })

            export const Json = Base.extend({
                variant: z.literal("json"),
                initialValue: z.json(),
            })

            export const List = Base.extend({
                variant: z.literal("list"),
                initialValue: z.array(z.string()),
            })

            export const Structure = Base.extend({
                variant: z.literal("structure"),
                initialValue: z.record(z.string(), z.any()),
            })


            // ---- Port inputs (runtime object references) ----
            // These receive instances of LangChain classes at runtime.
            // initialValue is a fallback for when no edge is connected.
            // For types that can't be synthesized from a fallback (e.g. LanguageModel),
            // they require an incoming edge — the engine enforces this.

            export const Message = Base.extend({
                variant: z.literal("message"),
                initialValue: z.string(),  // fallback: synthesized into HumanMessage at runtime
            })

            export const LanguageModel = Base.extend({
                variant: z.literal("languageModel"),
                // No initialValue — requires an incoming edge
            })

            export const Document = Base.extend({
                variant: z.literal("document"),
                initialValue: z.string().optional(), // fallback: synthesized into Document at runtime
            })

            export const Retriever = Base.extend({
                variant: z.literal("retriever"),
                // No initialValue — requires an incoming edge
            })

            export const Embeddings = Base.extend({
                variant: z.literal("embeddings"),
                // No initialValue — requires an incoming edge
            })

            export const VectorStore = Base.extend({
                variant: z.literal("vectorStore"),
                // No initialValue — requires an incoming edge
            })

            export const Tool = Base.extend({
                variant: z.literal("tool"),
                // No initialValue — requires an incoming edge
            })

            export const DataFrame = Base.extend({
                variant: z.literal("dataFrame"),
                // No initialValue — requires an incoming edge
            })
        }

        export const Schema = z.discriminatedUnion("variant", [
            // Field inputs
            DerivedSchemas.String,
            DerivedSchemas.Float,
            DerivedSchemas.Secret,
            DerivedSchemas.Boolean,
            DerivedSchemas.MultiOption,
            DerivedSchemas.File,
            DerivedSchemas.List,
            DerivedSchemas.Json,
            DerivedSchemas.Integer,
            DerivedSchemas.Script,
            DerivedSchemas.Structure,
            // Port inputs
            DerivedSchemas.Message,
            DerivedSchemas.LanguageModel,
            DerivedSchemas.Document,
            DerivedSchemas.Retriever,
            DerivedSchemas.Embeddings,
            DerivedSchemas.VectorStore,
            DerivedSchemas.Tool,
            DerivedSchemas.DataFrame,
        ]);

        export type Schema = z.infer<typeof Schema>;

        // Field input interfaces
        export interface Integer extends z.infer<typeof DerivedSchemas.Integer> { }
        export interface Float extends z.infer<typeof DerivedSchemas.Float> { }
        export interface Secret extends z.infer<typeof DerivedSchemas.Secret> { }
        export interface Boolean extends z.infer<typeof DerivedSchemas.Boolean> { }
        export interface MultiOption extends z.infer<typeof DerivedSchemas.MultiOption> { }
        export interface File extends z.infer<typeof DerivedSchemas.File> { }
        export interface List extends z.infer<typeof DerivedSchemas.List> { }
        export interface Json extends z.infer<typeof DerivedSchemas.Json> { }
        export interface String extends z.infer<typeof DerivedSchemas.String> { }
        export interface Script extends z.infer<typeof DerivedSchemas.Script> { }
        export interface Structure extends z.infer<typeof DerivedSchemas.Structure> { }

        // Port input interfaces
        export interface Message extends z.infer<typeof DerivedSchemas.Message> { }
        export interface LanguageModel extends z.infer<typeof DerivedSchemas.LanguageModel> { }
        export interface Document extends z.infer<typeof DerivedSchemas.Document> { }
        export interface Retriever extends z.infer<typeof DerivedSchemas.Retriever> { }
        export interface Embeddings extends z.infer<typeof DerivedSchemas.Embeddings> { }
        export interface VectorStore extends z.infer<typeof DerivedSchemas.VectorStore> { }
        export interface Tool extends z.infer<typeof DerivedSchemas.Tool> { }
        export interface DataFrame extends z.infer<typeof DerivedSchemas.DataFrame> { }
    }
    export type Input = z.infer<typeof Input.Schema>



    // ============================================
    // OUTPUTS
    // ============================================

    export namespace Output {
        export const Id = z.string().brand("OutputId");
        export type Id = z.infer<typeof Id>;

        /**
         * Base schema shared by ALL outputs.
         */
        export const Base = z.object({
            id: Output.Id,
            handleVariants: z.array(HandleVariant),
            /** If true, this output is exposed as a Tool Handle (allowing the node to be used as a tool by an Agent) */
            asTool: z.boolean().optional(),
            uiData: z.object({
                displayName: z.string().optional(),
            }),
        })
        export interface Base extends z.infer<typeof Base> { }

        export namespace DerivedSchemas {
            export const Message = Base.extend({
                variant: z.literal("message"),
            })

            export const Text = Base.extend({
                variant: z.literal("text"),
            })

            export const LanguageModel = Base.extend({
                variant: z.literal("languageModel"),
            })

            export const Document = Base.extend({
                variant: z.literal("document"),
            })

            export const Retriever = Base.extend({
                variant: z.literal("retriever"),
            })

            export const Embeddings = Base.extend({
                variant: z.literal("embeddings"),
            })

            export const VectorStore = Base.extend({
                variant: z.literal("vectorStore"),
            })

            export const Tool = Base.extend({
                variant: z.literal("tool"),
            })

            export const DataFrame = Base.extend({
                variant: z.literal("dataFrame"),
            })

            export const Data = Base.extend({
                variant: z.literal("data"),
            })
        }

        export const Schema = z.discriminatedUnion("variant", [
            DerivedSchemas.Message,
            DerivedSchemas.Text,
            DerivedSchemas.LanguageModel,
            DerivedSchemas.Document,
            DerivedSchemas.Retriever,
            DerivedSchemas.Embeddings,
            DerivedSchemas.VectorStore,
            DerivedSchemas.Tool,
            DerivedSchemas.DataFrame,
            DerivedSchemas.Data,
        ]);

        export type Schema = z.infer<typeof Schema>;

        export interface Message extends z.infer<typeof DerivedSchemas.Message> { }
        export interface Text extends z.infer<typeof DerivedSchemas.Text> { }
        export interface LanguageModel extends z.infer<typeof DerivedSchemas.LanguageModel> { }
        export interface Document extends z.infer<typeof DerivedSchemas.Document> { }
        export interface Retriever extends z.infer<typeof DerivedSchemas.Retriever> { }
        export interface Embeddings extends z.infer<typeof DerivedSchemas.Embeddings> { }
        export interface VectorStore extends z.infer<typeof DerivedSchemas.VectorStore> { }
        export interface Tool extends z.infer<typeof DerivedSchemas.Tool> { }
        export interface DataFrame extends z.infer<typeof DerivedSchemas.DataFrame> { }
        export interface Data extends z.infer<typeof DerivedSchemas.Data> { }
    }
    export type Output = z.infer<typeof Output.Schema>



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
            })
        }
        export type Meta = z.infer<typeof Meta.Schema>

        export const Schema = Meta.Schema.extend({
            inputs: z.array(Foundations.Input.Schema).readonly(),
            outputs: z.array(Foundations.Output.Schema).readonly(),
            description: z.string(),
        }).readonly()
    }

    export type Blueprint = z.infer<typeof Blueprint.Schema>
}