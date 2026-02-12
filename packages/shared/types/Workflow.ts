import { z } from "zod"
import { Foundations } from "./Foundations";

export namespace Workflow {
    export const Id = z.string().brand("WorkflowId");
    export type Id = z.infer<typeof Id>;


    export namespace Edge {
        export const Id = z.string().brand("EdgeId");
        export type Id = z.infer<typeof Id>;

        export const Schema = z.object({
            id: Edge.Id,
            source: z.object({
                nodeId: Node.Id,
                portId: Foundations.Port.Output.Id
            }),
            target: z.object({
                nodeId: Node.Id,
                portId: Foundations.Port.Input.Id,
            })
        })
    }
    export interface Edge extends z.infer<typeof Edge.Schema> { }




    export namespace Node {
        export const Id = z.string().brand("NodeId");
        export type Id = z.infer<typeof Id>;


        export const Schema = z.object({
            id: Node.Id,
            blueprintId: z.string().brand("BlueprintId"),

            displayName: z.string(),

            config: z.record(Foundations.NodeConfig.Id, Foundations.NodeConfig.Schema),
            inputs: z.array(Foundations.Port.Input.Schema),
            outputs: z.array(Foundations.Port.Output.Schema),

            icon: z.string().nullable().optional(),
            description: z.string().optional(),
            isMinimized: z.boolean().default(false),
        });
    }
    export interface Node extends z.infer<typeof Node.Schema> { }



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
            staticValues: z.record(
                                Node.Id, 
                                z.record(
                                    z.union([Foundations.NodeConfig.Id, Foundations.Port.Input.Id]), 
                                    z.union([ z.string(), z.number(), z.boolean(), z.array(z.string()), z.json()])
                                )
                            ),

            ui: z.object({
                layout: Layout.Schema,
                viewport: Viewport.Schema,
                icon: z.string().nullable().optional(),
                icon_color: z.string().nullable().optional(),
            }),
        })
    });


    export const INITIAL = {
        id: "" as Workflow.Id,
        locked: false,
        display_name: "",
        description: "",
        created_at: new Date(),
        updated_at: new Date(),
        data: {
            nodes: {},
            edges: {},
            staticValues: {},
            ui: {
                layout: {},
                viewport: { x: 0, y: 0, zoom: 1 },
                icon: null,
                icon_color: null,
            }
        }
    } as const satisfies z.infer<typeof Schema>
}
export interface Workflow extends z.infer<typeof Workflow.Schema> { }




