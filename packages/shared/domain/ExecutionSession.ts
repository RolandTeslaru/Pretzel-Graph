import { z } from "zod"
import { Workflow } from "./Workflow"
import { Chat } from "./Chat"
import { type AxiosInstance } from "axios"
import { Auth } from "./Auth"

export namespace ExecutionSession {

    export const Id = z.string().brand("ExecutionSessionId")
    export type Id = z.infer<typeof Id>

    export function createId() {
        return crypto.randomUUID() as Id
    }

    export const Schema = z.object({
        id: Id,
        node_outputs: z.record(Workflow.Node.Id, z.any()).default(() => ({})),
        node_messages: z.record(Workflow.Node.Id, z.string()).default(() => ({})),
        messages: z.array(z.lazy(() => Chat.Message.Schema)).default(() => ([])),
        attachments: z.record(z.string(), z.lazy(() => Chat.Attachment.Schema)).default(() => ({})),
        metadata: z.record(z.string(), z.any()).default(() => ({})),
        chatId: z.lazy(() => Chat.Id).optional(),
    })

    export const INITIAL = {
        id: createId(),
        node_outputs: {},
        node_messages: {},
        messages: [],
        attachments: {},
        metadata: {}
    } as z.infer<typeof Schema>

    export const Update = Schema.partial()
    export type Update = z.infer<typeof Update>


    export namespace NodeStatus {
        export const Schema = z.object({
            status: z.enum(["idle", "running", "completed", "failed"]),
            error: z.string().optional(),
            started_at:   z.iso.datetime(),
            completed_at: z.iso.datetime(),
        })
        export type Type = z.infer<typeof Schema>
    }
    export type NodeStatus = z.infer<typeof NodeStatus.Schema>


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
