import { z } from "zod"
import { Foundations } from "./Foundations";
import { type SupabaseClient } from "@supabase/supabase-js";
import { Auth } from "./Auth";

export namespace Workflow {
    export const Id = z.string().brand("WorkflowId");
    export type Id = z.infer<typeof Id>;


    export namespace Node {
        export const Id = z.string().brand("NodeId");
        export type Id = z.infer<typeof Id>;

        export const Schema = z.object({
            id: Node.Id,
            blueprintId: z.string().brand("BlueprintId"),

            displayName: z.string(),

            fields: z.array(Foundations.Field.Schema),
            inputs: z.array(Foundations.Port.Input.Schema),
            outputs: z.array(Foundations.Port.Output.Schema),

            toolCompatible: z.boolean().optional(),
            
            icon: z.string().nullable().optional(),
            description: z.string().nullable().optional(),
            isMinimized: z.boolean().default(false),
            isFlipped: z.boolean().optional(),
            isDisabled: z.boolean().optional(),
            accent: z.string().optional(),
        });

        export function createId(blueprintId: Foundations.Blueprint.Id) {
            return `${blueprintId}-${uid.randomUUID(5)}` as Workflow.Node.Id
        }
    }
    export interface Node extends z.infer<typeof Node.Schema> { }

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

        export function createId(
            _sourceNodeId: Node.Id,
            _sourcePortId: Foundations.Port.Output.Id,
            _targetNodeId: Node.Id,
            _targetPortId: Foundations.Port.Input.Id
        ) {
            return `${_sourceNodeId}|${_sourcePortId}|${_targetNodeId}|${_targetPortId}` as Workflow.Edge.Id
        }
    }
    export interface Edge extends z.infer<typeof Edge.Schema> { }



    export namespace Arc {
        export const Id = z.string().brand("ArcId")
        export type Id = z.infer<typeof Id>

        export function getId(sourceNodeId: Node.Id, targetNodeId: Node.Id){
            return `${sourceNodeId}-${targetNodeId}` as Arc.Id
        }
    }




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
        display_name: z.string(),
        locked: z.boolean(),
        description: z.string().optional().nullable(),

        created_at: z.coerce.date(),
        updated_at: z.coerce.date(),

        folder_id: z.string().brand("FolderId"),

        data: z.object({
            nodes: z.record(Node.Id, Node.Schema),
            edges: z.record(Edge.Id, Edge.Schema),
            staticValues: z.record(
                Node.Id,
                z.record(
                    z.union([Foundations.Field.Id, Foundations.Port.Input.Id]),
                    z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.json()])
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
        folder_id: "" as Workflow["folder_id"],
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


    export namespace Database {
        export namespace Row {
            export const Schema = Workflow.Schema.extend({
                user_id: Auth.User.Id,
            })
        }
        export type Row = z.infer<typeof Row.Schema>
    }



    export namespace API {
        export namespace Get {
            export const Request = z.object({
                workflowId: Workflow.Id
            })
            export type Request = z.infer<typeof Request>

            export const Response = z.object({
                workflow: Workflow.Schema
            })
            export type Response = z.infer<typeof Response>

        }
        export async function get(supabase: SupabaseClient, request: Get.Request): Promise<Get.Response> {
            const { data, error } = await supabase
                .from("workflows")
                .select("*")
                .eq("id", request.workflowId)
                .maybeSingle()

            if (error) throw error
            if (!data) throw new Error("Workflow not found")

            return {
                workflow: data
            }
        }


        export namespace Commit {
            export const Request = z.object({
                workflow: Workflow.Schema
            })
            export type Request = z.infer<typeof Request>

            export const Response = z.object({})
            export type Response = z.infer<typeof Response>

        }
        export async function commit(supabase: SupabaseClient, request: Commit.Request): Promise<Commit.Response> {
            const workflowId = request.workflow.id;
            const { data, error } = await supabase
                .from("workflows")
                .update(request.workflow)
                .eq("id", workflowId)
                .select()
                .maybeSingle()

            if (error) throw error
            if (!data) throw new Error("Workflow not found")

            return {}
        }
    }

    export interface Cache {
        // nodes coming
        incomingEdgesMap: Record<
            Workflow.Node.Id,     // the node where the edges are coming in
            Record<
                Workflow.Node.Id,     // the source node id
                Workflow.Edge.Id      // the edge id
            >
        >,
        outgoingEdgesMap: Record<
            Workflow.Node.Id,     // (source node id) the node where the edges are going out from
            Record<
                Workflow.Node.Id, // (target node id) 
                Workflow.Edge.Id
            >
        >,
        inputHandlesMap: Record<
            Workflow.Node.Id,
            Record<
                Foundations.Port.Input.Id,
                Workflow.Edge.Id
            >
        >,
        outputHandlesMap: Record<
            Workflow.Node.Id,
            Record<
                Foundations.Port.Output.Id,
                Workflow.Edge.Id
            >
        >
    }

    export namespace Cache {
        export const INITIAL = {
            incomingEdgesMap: {},
            outgoingEdgesMap: {},
            inputHandlesMap: {},
            outputHandlesMap: {},
        }
    }

    export function createCache(wf: Workflow): Cache {
        const cache = {
            incomingEdgesMap: {},
            outgoingEdgesMap: {},
            inputHandlesMap: {},
            outputHandlesMap: {},
        } as Cache;

        Object.values(wf.data.nodes).forEach(node => {
            cache.outgoingEdgesMap[node.id] = {};
            cache.incomingEdgesMap[node.id] = {};
            cache.inputHandlesMap[node.id] = {};
            cache.outputHandlesMap[node.id] = {};
        })

        Object.values(wf.data.edges).forEach(edge => {
            const sourceNodeId = edge.source.nodeId;
            const targetNodeId = edge.target.nodeId;

            const sourceHandleId = edge.source.portId;
            const targetHandleId = edge.target.portId

            // Outgoers Edges Map
            cache.outgoingEdgesMap[sourceNodeId][targetNodeId] = edge.id

            // Ingoers Edges Map
            cache.incomingEdgesMap[targetNodeId][sourceNodeId] = edge.id

            cache.inputHandlesMap[targetNodeId][targetHandleId] = edge.id

            cache.outputHandlesMap[sourceNodeId][sourceHandleId] = edge.id

        })

        return cache
    }

    export function deriveArcs(cache: Cache) {
        const arcMap: Record<
            Workflow.Node.Id,       // Source node id
            Set<
                Workflow.Node.Id    // Target Node id
                >
        > = {} 

        for (const [src, targets] of Object.entries(cache.outgoingEdgesMap)){
            arcMap[src as Workflow.Node.Id] = new Set(Object.keys(targets) as Workflow.Node.Id[])
        }

        return arcMap
    }

    export function deriveReversedArcs(cache: Cache) {
        const reversedArcMap: Record<
            Workflow.Node.Id,       // Target node id
            Set<
                Workflow.Node.Id    // Source Node id
                >
        > = {} 

        for (const [tgt, sources] of Object.entries(cache.incomingEdgesMap)){
            reversedArcMap[tgt as Workflow.Node.Id] = new Set(Object.keys(sources) as Workflow.Node.Id[])
        }

        return reversedArcMap
    }
}
export type Workflow = z.infer<typeof Workflow.Schema> 


const uid = {
    randomUUID: (length: number) => Math.random().toString(36).substring(2, 2 + length)
}