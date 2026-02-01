import { z } from "zod"

export namespace Node {
    export const Id = z.string().brand("NodeId");
    export type Id = z.infer<typeof Id>;


    export namespace Config {
        export const Id = z.string().brand("ConfigId");
        export type Id = z.infer<typeof Id>;

        export const Base = z.object({
            id: Config.Id,
            required: z.boolean(),
            reconcile: z.boolean(),

            uiData: z.object({
                displayName: z.string(),
                tooltip: z.string().optional(),
                placeholder: z.string().optional(),
            }),
        })

        export const Integer = Base.extend({
            variant: z.literal("integer"),
            initialValue: z.int(),
            data: z.object({
                min: z.int().optional(),
                max: z.int().optional(),
                step: z.int().optional(),
            })
        })

        export const Float = Base.extend({
            variant: z.literal("float"),
            initialValue: z.number(),
            data: z.object({
                min: z.number().optional(),
                max: z.number().optional(),
                step: z.number().optional(),
            })
        })

        export const String = Base.extend({
            variant: z.literal("string"),
            initialValue: z.string(),
            data: z.object({
                multiline: z.boolean().optional(),
                password: z.boolean().optional(),
            })
        })

        export const Secret = Base.extend({
            variant: z.literal("secret")
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
                variat: z.enum(["select", "tab"]).optional().default("select"),
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

        export const Record = Base.extend({
            variant: z.literal("record"),
            initialValue: z.record(z.string(), z.string()),
        })

        export const Schema = z.discriminatedUnion("variant", [
            String,
            Float,
            Secret,
            Boolean,
            MultiOption,
            File,
            Record,
            Integer,
            Script,
        ]);

        export type Schema = z.infer<typeof Schema>;
        export type Integer = z.infer<typeof Integer>;
        export type Float = z.infer<typeof Float>;
        export type Secret = z.infer<typeof Secret>;
        export type Boolean = z.infer<typeof Boolean>;
        export type MultiOption = z.infer<typeof MultiOption>;
        export type File = z.infer<typeof File>;
        export type Record = z.infer<typeof Record>;
        export type String = z.infer<typeof String>;
        export type Script = z.infer<typeof Script>;
    }


    export const LangChainDataType = z.enum([
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
        "Unknown"
    ])
    export type LangChainDataType = z.infer<typeof LangChainDataType>

    /**
   * Defines the SCHEMA for a parameter (Metadata).
   * This tells the UI how to render the input (e.g., "This is a float, it is required").
   */
    export namespace Input {
        export const Id = z.string().brand("InputId");
        export type Id = z.infer<typeof Id>;

        export const Schema = z.object({
            id: Input.Id,
            required: z.boolean(),
            dataTypes: z.array(LangChainDataType),
            /** If true, this field is exposed as a parameter when the node is used as a Tool */
            asTool: z.boolean(),
            reconcile: z.boolean(),

            uiData: z.object({
                displayName: z.string(),
                tooltip: z.string().optional(),
                placeholder: z.string().optional(),
            }),
        });
    }
    export type Input = z.infer<typeof Input.Schema>;



    export namespace Output {
        export const Id = z.string().brand("OutputId");
        export type Id = z.infer<typeof Id>;

        export const Schema = z.object({
            id: Output.Id,
            dataTypes: z.array(LangChainDataType),
            selectedType: LangChainDataType.optional(),
            /** If true, this output is exposed as a Tool Handle (allowing the node to be used as a tool by an Agent) */
            asTool: z.boolean().optional(),
            uiData: z.object({
                displayName: z.string().optional(),
            }),
        })
    }
    export type Output = z.infer<typeof Output.Schema>;


    export const Schema = z.object({
        id: Node.Id,
        blueprintId: z.string().brand("BlueprintId"),
        display_name: z.string(),

        data: z.object({
            inputs: z.array(Input.Schema),
            outputs: z.array(Output.Schema),
            configs: z.array(Config.Schema),

            ui: z.object({
                icon: z.string().nullable().optional(),
                description: z.string(),
            })
        })
    });
}