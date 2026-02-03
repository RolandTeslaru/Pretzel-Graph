import { z } from "zod"

export namespace Workflow {
    export const Id = z.string().brand("WorkflowId");
    export type Id = z.infer<typeof Id>;


    export namespace Node {
        export const Id = z.string().brand("NodeId");
        export type Id = z.infer<typeof Id>;


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
            "DataFrame",
            "Unknown"
        ])
        export type LangChainDataType = z.infer<typeof LangChainDataType>


        export namespace Input {
            export const Id = z.string().brand("InputId");
            export type Id = z.infer<typeof Id>;

            export const Base = z.object({
                id:         Input.Id,
                required:   z.boolean(),
                reconcile:  z.boolean(),
                asTool:     z.boolean(),

                isRuntime:  z.boolean().default(false),

                langChainDataTypes: z.array(LangChainDataType),

                runtimeSubInputsRegistry: z.record(Node.Input.Id, z.object({
                    id: Node.Input.Id,
                    parentInputId: Node.Input.Id,
                    display_name: z.string(),
                })).optional(),

                uiData: z.object({
                    displayName: z.string(),
                    tooltip: z.string().optional(),
                    placeholder: z.string().optional(),
                }),
            })
            export type Base = z.infer<typeof Base>

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
            ]);

            export type Schema = z.infer<typeof Schema>;

            export type Integer     = z.infer<typeof DerivedSchemas.Integer>;
            export type Float       = z.infer<typeof DerivedSchemas.Float>;
            export type Secret      = z.infer<typeof DerivedSchemas.Secret>;
            export type Boolean     = z.infer<typeof DerivedSchemas.Boolean>;
            export type MultiOption = z.infer<typeof DerivedSchemas.MultiOption>;
            export type File        = z.infer<typeof DerivedSchemas.File>;
            export type List        = z.infer<typeof DerivedSchemas.List>;
            export type Json        = z.infer<typeof DerivedSchemas.Json>;
            export type String      = z.infer<typeof DerivedSchemas.String>;
            export type Script      = z.infer<typeof DerivedSchemas.Script>;
        }
        export type Input = z.infer<typeof Input.Schema>



        export namespace Output {
            export const Id = z.string().brand("OutputId");
            export type Id = z.infer<typeof Id>;

            export const Schema = z.object({
                id: Output.Id, 
                langChainDataTypes: z.array(LangChainDataType),
                /** If true, this output is exposed as a Tool Handle (allowing the node to be used as a tool by an Agent) */
                asTool: z.boolean().optional(),
                uiData: z.object({
                    displayName: z.string().optional(),
                }),
            })
        }
        export type Output = z.infer<typeof Output.Schema>;

        export const VersionId = z.string().brand("NodeVersionId")
        export type VersionId = z.infer<typeof VersionId>

        export const Schema = z.object({
            id:           Node.Id,
            versionId:    VersionId,
            blueprintId:  z.string().brand("BlueprintId"),

            display_name: z.string(),

            data: z.object({
                inputs:        z.record(Input.Id, Input.Schema),
                outputs:       z.record(Output.Id, Output.Schema),

                ui: z.object({
                    icon:        z.string().nullable().optional(),
                    description: z.string().optional(),
                    isMinimized: z.boolean().default(false),       

                    normalInputsOrder:   z.array(Input.Id),
                    advancedInputsOrder: z.array(Input.Id),
                })
            })
        });
    }
    export type Node = z.infer<typeof Node.Schema>



    export namespace Edge {
        export const Id = z.string().brand("EdgeId");
        export type Id = z.infer<typeof Id>;

        export const Schema = z.object({
            id: Edge.Id,
            source: z.object({
                nodeId: Node.Id,
                handleId: Node.Output.Id
            }),
            target: z.object({
                nodeId: Node.Id,
                handleId: Node.Input.Id,
            })
        })
    }
    export type Edge = z.infer<typeof Edge.Schema>;




    export namespace Layout {
        export const Schema = z.record(
            Node.Id,
            z.object({
                x: z.number(),
                y: z.number()
            })
        );
    }
    export type Layout = z.infer<typeof Layout.Schema>;




    export namespace Viewport {
        export const Schema = z.object({
            x: z.number(),
            y: z.number(),
            zoom: z.number(),
        });
    }
    export type Viewport = z.infer<typeof Viewport.Schema>;



    export const Schema = z.object({
        id: Workflow.Id,
        display_name: z.string().optional(),
        locked: z.boolean(),
        description: z.string().optional(),

        created_at: z.iso.datetime(),
        updated_at: z.iso.datetime(),

        data: z.object({
            nodes: z.record(Node.Id, Node.Schema),
            edges: z.record(Edge.Id, Edge.Schema),
            fieldValues: z.record(Node.Id, z.record(Node.Input.Id, z.any())),

            ui: z.object({
                layout: Layout.Schema,
                viewport: Viewport.Schema,
                icon: z.string().nullable().optional(),
                icon_color: z.string().nullable().optional(),
            }),
        })
    });

}
export type Workflow = z.infer<typeof Workflow.Schema>;




