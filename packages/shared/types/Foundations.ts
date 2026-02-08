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
        "Chain",
        "Embeddings",
        "VectorStore",
        "Retriever",
        "Tool",
        "Memory",
        "OutputParser",
        "DataFrame",
        "Unknown",
        "Structure"
    ])
    export type HandleVariant = z.infer<typeof HandleVariant>


    export namespace Input {
        export const Id = z.string().brand("InputId");
        export type Id = z.infer<typeof Id>;

        export const Base = z.object({
            id: Input.Id,
            required: z.boolean(),
            reconcile: z.boolean(),
            asTool: z.boolean(),

            isRuntime: z.boolean().default(false),

            handleVariants: z.array(HandleVariant),

            runtimeSubInputsRegistry: z.record(Input.Id, z.object({
                id: Input.Id,
                parentInputId: Input.Id,
                display_name: z.string(),
            })).optional(),

            uiData: z.object({
                displayName: z.string(),
                tooltip: z.string().optional(),
                placeholder: z.string().optional(),
            }),
        })
        export interface Base extends z.infer<typeof Base> { }

        export namespace DerivedSchemas {
            export const Integer = Base.extend({
                variant: z.literal("integer"),
                initialValue: z.int(),
                data: z.object({
                    min: z.int().optional(),
                    max: z.int().optional(),
                    step: z.int().optional(),
                    slider: z.boolean().optional(),
                })
            })

            export const Float = Base.extend({
                variant: z.literal("float"),
                initialValue: z.number(),
                data: z.object({
                    min: z.number().optional(),
                    max: z.number().optional(),
                    step: z.number().optional(),
                    slider: z.boolean().optional(),
                })
            })


            export const String = Base.extend({
                variant: z.literal("string"),
                initialValue: z.string(),
                data: z.object({
                    multiline: z.boolean(),
                })
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
                data: z.object({
                    options: z.array(z.string()),
                    variant: z.enum(["select", "tab"]).default("select"),
                })
            })

            export const File = Base.extend({
                variant: z.literal("file"),
                initialValue: z.string(),
                data: z.object({
                    fileTypes: z.array(z.string()).optional(),
                })
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
        }

        export const Schema = z.discriminatedUnion("variant", [
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
            DerivedSchemas.Structure
        ]);

        export type Schema = z.infer<typeof Schema>;

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
    }
    export type Input = z.infer<typeof Input.Schema>

    export namespace Output {
        export const Id = z.string().brand("OutputId");
        export type Id = z.infer<typeof Id>;

        export const Schema = z.object({
            id: Output.Id,
            handleVariants: z.array(HandleVariant),
            /** If true, this output is exposed as a Tool Handle (allowing the node to be used as a tool by an Agent) */
            asTool: z.boolean().optional(),
            uiData: z.object({
                displayName: z.string().optional(),
            }),
        })
    }
    export interface Output extends z.infer<typeof Output.Schema> { }


    export namespace NodeDefinition {
        export const Id = z.string().brand("NodeDefinitionId")
        export type Id = z.infer<typeof Id>

        export const Schema = z.object({
            id: NodeDefinition.Id,
            inputs: z.array(Foundations.Input.Schema).readonly(),
            outputs: z.array(Foundations.Output.Schema).readonly(),
            displayName: z.string(),
            description: z.string(),
            icon: z.string(),
            drawerId: z.string().brand("DrawerId"),
        }).readonly()
    }

    export type NodeDefinition = z.infer<typeof NodeDefinition.Schema>
}