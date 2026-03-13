import { z } from "zod"
import { Workflow } from "./Workflow"
import { type AxiosInstance } from "axios"
import { Auth } from "./Auth"
import { Chat } from "./Chat"
import { BaseMessage } from "@langchain/core/messages"
import { Realtime } from "./Realtime"

export namespace ExecutionSession {

    export const Id = z.string().brand("ExecutionSessionId")
    export type Id = z.infer<typeof Id>


    export function createId() {
        return crypto.randomUUID() as Id
    }


    export namespace NodeStatus {
        export const Schema = z.object({
            status: z.enum(["idle", "running", "completed", "waiting", "failed"]),
            error: z.string().optional(),
            started_at:   z.iso.datetime().optional(),
            completed_at: z.iso.datetime().optional(),
        })
        export type Type = z.infer<typeof Schema>
    }
    export type NodeStatus = z.infer<typeof NodeStatus.Schema>

    
    export const Schema = z.object({
        id: Id,
        node_outputs: z.record(Workflow.Node.Id, z.any()).default(() => ({})),
        node_messages: z.record(Workflow.Node.Id, z.string()).default(() => ({})),
        node_status: z.record(Workflow.Node.Id, NodeStatus.Schema).default(() => ({})),
        messages: z.array(z.instanceof(BaseMessage)).default(() => ([])),
        metadata: z.record(z.string(), z.any()).default(() => ({})),
        chatId: z.lazy(() => Chat.Id).optional(),
    })


    export const INITIAL = {
        id: createId(),
        node_outputs: {},
        node_status: {},
        node_messages: {},
        messages: [],
        metadata: {}
    } as z.infer<typeof Schema>


    export const Update = Schema.partial()
    export type Update = z.infer<typeof Update>


    export namespace Database {
        export namespace Row {
            export const Schema = z.object({
                id: ExecutionSession.Id,
                data: ExecutionSession.Schema,
                user_id: Auth.User.Id,
                workflow_id: Workflow.Id,
                created_at: z.iso.datetime(),
                updated_at: z.iso.datetime(),
            })
            export type Type = z.infer<typeof Schema>
        }
    }


    export namespace Event {
        export const Topic = Realtime.Topic.brand("ExecutionSessionTopic")
        export type Topic = z.infer<typeof Topic>
        
        export function getTopic(executionSessionId: ExecutionSession.Id) {
            return `execution_session:${executionSessionId}` as Topic
        }

        // Create a base from the realtime event base
        const Base = Realtime.Event.Base.extend({
            executionSessionId: ExecutionSession.Id,
            workflowId: Workflow.Id,
            topic: Event.Topic
        })

        export const Update = Base.extend({
            type: z.literal('update'),
            update: ExecutionSession.Update
        })

        export const MessageChunk = Base.extend({
            type: z.literal('node_messages:chunk'),
            nodeId: Workflow.Node.Id,
            chunk: z.string(),
            isChatOutput: z.boolean().optional(),
        })

        export namespace Node {
            export const Started = Base.extend({
                type: z.literal('node:started'),
                nodeId: Workflow.Node.Id
            })

            export const Completed = Base.extend({
                type: z.literal('node:completed'),
                nodeId: Workflow.Node.Id,
                output: z.unknown()
            })

            export const Error = Base.extend({
                type: z.literal('node:error'),
                nodeId: Workflow.Node.Id,
                error: z.string()
            })

            export const Waiting = Base.extend({
                type: z.literal("node:waiting"),
                nodeId: Workflow.Node.Id,
                dependencyResolutionMap: z.record(Workflow.Node.Id, z.boolean()),
                totalDeps: z.number()
            })

            export type Started = z.infer<typeof Started>
            export type Completed = z.infer<typeof Completed>
            export type Error = z.infer<typeof Error>
            export type Waiting = z.infer<typeof Waiting>

            export const Schema = z.discriminatedUnion("type", [
                Started,
                Completed,
                Error,
                Waiting
            ])

        }
        export type Node = z.infer<typeof Node.Schema>


        export const Schema = z.discriminatedUnion("type", [
            Update,
            MessageChunk,
            Node.Started,
            Node.Completed,
            Node.Error,
            Node.Waiting
        ])
    }
    export type Event = z.infer<typeof Event.Schema>


    export namespace API {
        export namespace Create {
            export const Request = z.object({
                workflowId: Workflow.Id,
                session: ExecutionSession.Schema
            })
            export type Request = z.infer<typeof Request>

            export const Response = z.object({
                session: ExecutionSession.Schema
            })
            export type Response = z.infer<typeof Response>
        }
        export async function create(
            api: AxiosInstance,
            req: Create.Request
        ): Promise<Create.Response> {
            const { data } = await api.post<Create.Response>(
                '/api/execution-session/create',
                req
            );
            return data;
        }

        export namespace Get {
            export const Request = z.object({
                id: ExecutionSession.Id
            })
            export type Request = z.infer<typeof Request>

            export const Response = z.object({
                session: ExecutionSession.Schema
            })
            export type Response = z.infer<typeof Response>
        }
        export async function get(
            api: AxiosInstance,
            req: Get.Request
        ): Promise<Get.Response> {
            const { data } = await api.post<Get.Response>(
                '/api/execution-session/get',
                req
            );
            return data;
        }

        export namespace Update {
            export const Request = z.object({
                id: ExecutionSession.Id,
                session: ExecutionSession.Update
            })
            export type Request = z.infer<typeof Request>

            export const Response = z.object({
                session: ExecutionSession.Schema
            })
            export type Response = z.infer<typeof Response>
        }
        export async function update(
            api: AxiosInstance,
            req: Update.Request
        ): Promise<Update.Response> {
            const { data } = await api.post<Update.Response>(
                '/api/execution-session/update',
                req
            );
            return data;
        }
    }
}
export type ExecutionSession = z.infer<typeof ExecutionSession.Schema>
