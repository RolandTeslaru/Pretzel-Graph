import z from "zod"
import { type AxiosInstance } from "axios"
import { type GoTrueClient } from "@supabase/auth-js"
import { Workflow } from "../Workflow"
import { ChatId } from "./ids"
import { ChatSchema } from "./chat"
import { Message as MessageD } from "./message"

export namespace API {
    export namespace Message {
        export namespace Add {
            export const Request = z.lazy(() => z.strictObject({
                messages: z.array(MessageD.Schema),
            }))
            export type Request = z.infer<typeof Request>

            export const Response = z.object({})
            export type Response = z.infer<typeof Response>
        }
        export async function add(api: AxiosInstance, chatId: ChatId, req: Add.Request): Promise<Add.Response> {
            const { data } = await api.post<Add.Response>(
                `/api/chat/${chatId}/message/add`, req
            )
            return data
        }


        export namespace Update {
            export const Request = z.object({
                messageId: MessageD.Id,
                content: z.string(),
            })
            export type Request = z.infer<typeof Request>

            export const Response = z.object({})
            export type Response = z.infer<typeof Response>
        }
        export async function update(api: AxiosInstance, req: Update.Request): Promise<Update.Response> {
            const { data } = await api.post<Update.Response>(
                "/api/chat/message/update", req
            )
            return data
        }


        export namespace Erase {
            export const Request = z.object({
                messageId: MessageD.Id,
            })
            export type Request = z.infer<typeof Request>

            export const Response = z.object({})
            export type Response = z.infer<typeof Response>
        }
        export async function erase(api: AxiosInstance, req: Erase.Request): Promise<Message.Erase.Response> {
            const { data } = await api.post<Erase.Response>(
                "/api/chat/message/erase", req
            )
            return data
        }

        export namespace StreamOutput {
            export const Request = z.object({
                chatId: ChatId,
                jobId: z.string().brand("JobId")
            })
            export type Request = z.infer<typeof Request>
        }
        export async function streamOutput(auth: GoTrueClient, api_base_url: string, req: StreamOutput.Request): Promise<Response> {
            const { data } = await auth.getSession();
            const token = data.session?.access_token;
            if (!token)
                throw new Error("No token found");

            const response = await fetch(`${api_base_url}/api/chat/message/streamOutput`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(req)
            })

            return response;
        }
        export namespace StreamResponse {
            export const Request = z.object({
                responseMessage: MessageD.AI,
                jobId: z.string().brand("JobId")
            })
            export type Request = z.infer<typeof Request>
        }
        export async function streamResponse(auth: GoTrueClient, api_base_url: string, req: StreamResponse.Request): Promise<Response> {
            const { data } = await auth.getSession();
            const token = data.session?.access_token;
            if (!token)
                throw new Error("No token found");

            const response = await fetch(`${api_base_url}/api/chat/message/streamResponse`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(req)
            })

            return response;
        }
    }

    // The chat was the entire request, and it is now the entire path.
    export namespace Erase {
        export const Response = z.object({})
        export type Response = z.infer<typeof Response>
    }
    export async function erase(api: AxiosInstance, chatId: ChatId): Promise<Erase.Response> {
        const { data } = await api.post<Erase.Response>(
            `/api/chat/${chatId}/erase`, {}
        )
        return data
    }

    // The workflow the chat hangs off is the authorization boundary, so it travels in the
    // path and the route's scope guard proves ownership before the handler runs.
    export namespace Create {
        export const Request = z.strictObject({
            name: z.string().optional(),
        })
        export type Request = z.infer<typeof Request>

        export const Response = z.object({
            chat: ChatSchema
        })
        export type Response = z.infer<typeof Response>
    }
    export async function create(
        api:         AxiosInstance,
        workflow_id: Workflow.Id,
        req:         Create.Request,
    ): Promise<Create.Response> {
        const { data } = await api.post<Create.Response>(
            `/api/chat/${workflow_id}/create`, req
        )
        return data
    }

    // chatId stays in the body because it is a proposal, not a claim: the row may not exist
    // yet, so there is nothing to authorize against. The workflow it hangs off is the
    // authorization boundary and travels in the path.
    export namespace Ensure {
        export const Request = z.strictObject({
            chatId: ChatId,
            name: z.string().optional(),
        })
        export type Request = z.infer<typeof Request>

        export const Response = z.object({
            chat: ChatSchema
        })
        export type Response = z.infer<typeof Response>
    }
    export async function ensure(
        api:         AxiosInstance,
        workflow_id: Workflow.Id,
        req:         Ensure.Request,
    ): Promise<Ensure.Response> {
        const { data } = await api.post<Ensure.Response>(
            `/api/chat/${workflow_id}/ensure`, req
        )
        return data
    }

    export namespace Get {
        export const Request = z.strictObject({
            cursor: MessageD.Id.optional(),
            limit: z.number().int().positive().default(50).optional(),
        })
        export type Request = z.infer<typeof Request>

        export const Response = z.object({
            chat: ChatSchema,
            messages: z.array(MessageD.Schema),
        })
        export type Response = z.infer<typeof Response>
    }
    export async function get(api: AxiosInstance, chatId: ChatId, req: Get.Request = {}): Promise<Get.Response> {
        const { data } = await api.post<Get.Response>(
            `/api/chat/${chatId}/get`, req
        )
        return data
    }


    export namespace List {
        export const Request = z.object({})
        export type Request = z.infer<typeof Request>

        export const Response = z.object({
            chats: z.array(ChatSchema),
        })
        export type Response = z.infer<typeof Response>
    }
    export async function list(api: AxiosInstance, req: List.Request): Promise<List.Response> {
        const { data } = await api.post<List.Response>(
            "/api/chat/list", req
        )
        return data
    }

    // The workflow was the entire request, and it is now the entire path — so there is no
    // body left to describe.
    export namespace ListByWorkflow {
        export const Response = z.object({
            chats: z.array(ChatSchema),
        })
        export type Response = z.infer<typeof Response>
    }
    export async function listByWorkflow(
        api:         AxiosInstance,
        workflow_id: Workflow.Id,
    ): Promise<ListByWorkflow.Response> {
        const { data } = await api.post<ListByWorkflow.Response>(
            `/api/chat/${workflow_id}/list`, {}
        )
        return data
    }
}
