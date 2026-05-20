import { z } from "zod"
import { Field } from "./Foundations/Field";
import { Port } from "./Foundations/Port";
import { Auth } from "./Auth";
import { Blueprint } from "./Foundations/Blueprint";
import { Webhook } from "./Webhook";
import { VersionControlPublication } from "./VersionControlPublication";
import { Vault } from "./Vault";

export namespace Workflow {
    export const Id = z.string().brand("WorkflowId");
    export type Id = z.infer<typeof Id>;

    /** Dummy node ID used as the staticValues key for workflow-level config fields. */
    export const WORKFLOW_CONFIG_NODE_ID = "__workflow_config__" as Workflow.Node.Id;

    export function createId() {
        return crypto.randomUUID() as Workflow.Id
    }


    export namespace Node {
        export const Id = z.string().brand("NodeId");
        export type Id = z.infer<typeof Id>;

        export const Schema = Blueprint.Meta.Schema.extend({
            id:           Node.Id,
            blueprintId:  z.string().brand("BlueprintId"),

            fields:       z.array(Field.Schema),
            inputs:       z.array(Port.Input.Schema),
            outputs:      z.array(Port.Output.Schema),
            webhooks:     z.array(Webhook.Schema).optional(),

            isMinimized:  z.boolean().default(false),
            isFlipped:    z.boolean().optional(),
            isDisabled:   z.boolean().optional(),
        });

        export function createId(blueprintId: Blueprint.Id) {
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
                portId: Port.Output.Id
            }),
            target: z.object({
                nodeId: Node.Id,
                portId: Port.Input.Id,
            })
        })

        export function createId(
            _sourceNodeId: Node.Id,
            _sourcePortId: Port.Output.Id,
            _targetNodeId: Node.Id,
            _targetPortId: Port.Input.Id
        ) {
            return `${_sourceNodeId}|${_sourcePortId}|${_targetNodeId}|${_targetPortId}` as Workflow.Edge.Id
        }
    }
    export interface Edge extends z.infer<typeof Edge.Schema> { }





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



    export const DEFAULT_ICON = "graph"
    export const DEFAULT_ACCENT = "utility"  
    
    
    export namespace Data {
        export interface Shape {
            fields: Field[];
            nodes: Record<Node.Id, Node>;
            edges: Record<Edge.Id, Edge>;
            staticValues: Record<
                Node.Id,
                Record<
                    Field.Id | Port.Input.Id,
                    string | number | boolean | string[] | unknown
                >
            >;
            credentialInstanceIds: Record<
                Node.Id,
                Record<Vault.Credential.Template.Id, Vault.Credential.Instance.Id>
            >;
            ui: {
                layout: Layout;
                viewport: Viewport;
                icon_color?: string | null;
            };
            dependencies: {
                published: Record<Workflow.Id, Dependency.Publication>;
                draft:     Record<Workflow.Id, Dependency.Draft>;
            };
        }

        export const Schema: z.ZodType<Shape> = z.object({
            fields: z.array(Field.Schema).default([]), //config
            nodes: z.record(Node.Id, Node.Schema),
            edges: z.record(Edge.Id, Edge.Schema),
            staticValues: z.record(
                Node.Id,
                z.record(
                    z.union([Field.Id, Port.Input.Id]),
                    z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.json()])
                )
            ),
            credentialInstanceIds: z.record(
                Node.Id,
                z.record(Vault.Credential.Template.Id, Vault.Credential.Instance.Id)
            ).default({}),

            ui: z.object({
                layout:     Layout.Schema,
                viewport:   Viewport.Schema,
                icon_color: z.string().nullable().optional(),
            }),

            dependencies: z.object({
                published: z.record(Workflow.Id, z.lazy(() => Dependency.Publication.Schema)).default({}),
                draft:     z.record(Workflow.Id, z.lazy(() => Dependency.Draft.Schema)).default({}),
            }).default({ published: {}, draft: {} }),
        })
    }
    export type Data = z.infer<typeof Data.Schema>;

        
    export namespace Dependency {
        export namespace Publication {
            export const Schema = VersionControlPublication.createSchema(Workflow.Data.Schema)
                .omit({ name: true })
                .extend({
                    publication_name: z.string(),
                    display_name:     z.string(),
                    icon:             z.string().nullable().optional(),
                    accent:           z.string().nullable().optional(),
                });

            export const UpdateInfo = z.object({
                workflowId:    Workflow.Id,
                publicationId: VersionControlPublication.Id,
                version:       z.number(),
                name:          z.string(),
                description:   z.string().nullable(),
            })
            export type UpdateInfo = z.infer<typeof UpdateInfo>
        }
        export type Publication = z.infer<typeof Publication.Schema>

        export namespace Draft {
            export const Schema = z.object({
                workflow_id:         Workflow.Id,
                workflow_data:       z.lazy(() => Data.Schema),
                display_name:        z.string(),
                icon:                z.string().nullable().optional(),
                accent:              z.string().nullable().optional(),
                workflow_updated_at: z.coerce.date(),
            });

            export const UpdateInfo = z.object({
                workflowId:          Workflow.Id,
                workflow_updated_at: z.coerce.date(),
            });
            export type UpdateInfo = z.infer<typeof UpdateInfo>;
        }
        export type Draft = z.infer<typeof Draft.Schema>
    }

    export const Schema = z.object({
        id:           Workflow.Id,
        display_name: z.string(),
        locked:       z.boolean(),
        is_public:    z.boolean().default(false),
        description:  z.string().optional().nullable(),
        icon:         z.string().nullable().optional(),
        accent:       z.string().nullable().optional(),

        created_at: z.coerce.date(),
        updated_at: z.coerce.date(),

        folder_id: z.string().brand("FolderId"),

        data: Data.Schema
    });


    export const INITIAL = {
        id:             "" as Workflow.Id,
        locked:         false,
        is_public:      false,
        display_name:   "",
        description:    "",
        icon:           null,
        accent:         null,
        folder_id:      "" as Workflow["folder_id"],
        created_at:     new Date(),
        updated_at:     new Date(),
        data: {
            fields:                [],
            nodes:                 {},
            edges:                 {},
            staticValues:          {},
            credentialInstanceIds: {},
            dependencies:          { published: {}, draft: {} },
            ui: {
                layout:         {},
                viewport:       { x: 0, y: 0, zoom: 1 },
                icon_color:     null,
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
                Port.Input.Id,
                Workflow.Edge.Id
            >
        >,
        outputHandlesMap: Record<
            Workflow.Node.Id,
            Record<
                Port.Output.Id,
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

    export function createCache(data: Workflow.Data): Cache {
        const cache = {
            incomingEdgesMap: {},
            outgoingEdgesMap: {},
            inputHandlesMap: {},
            outputHandlesMap: {},
        } as Cache;

        Object.values(data.nodes).forEach(node => {
            cache.outgoingEdgesMap[node.id] = {};
            cache.incomingEdgesMap[node.id] = {};
            cache.inputHandlesMap[node.id] = {};
            cache.outputHandlesMap[node.id] = {};
        })

        Object.values(data.edges).forEach(edge => {
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
            Set<Workflow.Node.Id>   // Target Node ids
        > = {} 

        for (const [src, targets] of Object.entries(cache.outgoingEdgesMap)){
            arcMap[src as Workflow.Node.Id] = new Set(Object.keys(targets) as Workflow.Node.Id[])
        }

        return arcMap
    }

    export function deriveReversedArcs(cache: Cache) {
        const reversedArcMap: Record<
            Workflow.Node.Id,       // Target node id
            Set<Workflow.Node.Id>   // Source Node id
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
