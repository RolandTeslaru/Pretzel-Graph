import { z } from "zod"
import { Foundations } from "./Foundations";

export namespace Workflow {
    export const Id = z.string().brand("WorkflowId");
    export type Id = z.infer<typeof Id>;


    export namespace Node {
        export const Id = z.string().brand("NodeId");
        export type Id = z.infer<typeof Id>;


        export const Schema = z.object({
            id:           Node.Id,
            definitionId: Foundations.NodeDefinition.Id.default("Google.GenerativeAI.v1" as const as Foundations.NodeDefinition.Id),

            display_name: z.string(),

            data: z.object({
                inputs:        z.record(Foundations.Input.Id, Foundations.Input.Schema),
                outputs:       z.record(Foundations.Output.Id, Foundations.Output.Schema),

                ui: z.object({
                    icon:        z.string().nullable().optional(),
                    description: z.string().optional(),
                    isMinimized: z.boolean().default(false),       

                    normalInputsOrder:   z.array(Foundations.Input.Id),
                    advancedInputsOrder: z.array(Foundations.Input.Id),
                })
            })
        });
    }
    export interface Node extends z.infer<typeof Node.Schema> {}



    export namespace Edge {
        export const Id = z.string().brand("EdgeId");
        export type Id = z.infer<typeof Id>;

        export const Schema = z.object({
            id: Edge.Id,
            source: z.object({
                nodeId: Node.Id,
                handleId: Foundations.Output.Id
            }),
            target: z.object({
                nodeId: Node.Id,
                handleId: Foundations.Input.Id,
            })
        })
    }
    export interface Edge extends z.infer<typeof Edge.Schema> {}




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

        created_at: z.coerce.date(),
        updated_at: z.coerce.date(),

        data: z.object({
            nodes: z.record(Node.Id, Node.Schema),
            edges: z.record(Edge.Id, Edge.Schema),
            fieldValues: z.record(Node.Id, z.record(Foundations.Input.Id, z.any())),

            ui: z.object({
                layout: Layout.Schema,
                viewport: Viewport.Schema,
                icon: z.string().nullable().optional(),
                icon_color: z.string().nullable().optional(),
            }),
        })
    });

}
export interface Workflow extends z.infer<typeof Workflow.Schema> {}




