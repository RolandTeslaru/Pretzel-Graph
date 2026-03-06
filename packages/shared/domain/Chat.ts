import { z } from "zod"
import { Workflow } from "./Workflow"
import { type AxiosInstance } from "axios"
import { type SupabaseClient } from "@supabase/supabase-js";
import { Realtime } from "./Realtime";
import { ExecutionSession } from "./ExecutionSession";

export namespace Chat {

    export const Id = z.string().brand("ChatId")
    export type Id = z.infer<typeof Id>

    export function createId() {
        return crypto.randomUUID() as Id
    }


    export namespace Attachment {
        export const Id = z.string().brand("AttachmentId")
        export type Id = z.infer<typeof Attachment.Id>

        export const Schema = z.object({
            id: Attachment.Id,
            url: z.string(),
            name: z.string(),
            mime_type: z.string(),
            size_bytes: z.number(),
            storage_path: z.string(),
            uploaded_at: z.iso.datetime()
        })
    }
    export type Attachment = z.infer<typeof Attachment.Schema>


    export namespace ToolCall {
        export const Id = z.string().brand("ToolCallId")
        export const Schema = z.object({
            id: ToolCall.Id,
            name: z.string(),
            arguments: z.record(z.string(), z.unknown()),
        })
        export const Status = z.enum(["success", "error"])
        export type Status = z.infer<typeof Status>
    }


    export namespace Message {
        export const Id = z.string().brand("MessageId")
        export type Id = z.infer<typeof Message.Id>

        export function createId() {
            return crypto.randomUUID() as Id
        }

        export const Role = z.enum(["user", "ai", "tool", "system"])
        export type Role = z.infer<typeof Role>

        export const Base = z.object({
            id: Message.Id,
            content: z.string(),
            chat_id: Chat.Id,
            created_at: z.iso.datetime(),
            updated_at: z.iso.datetime(),
            attachments: z.record(Attachment.Id, Attachment.Schema).optional(),
            job_id: z.string().brand("JobId").optional(),
        })

        function configLiteral<T extends Role>(value: T) {
            return z.literal(value);
        }

        export const User = Base.extend({
            role: configLiteral("user"),
            data: z.object({}).optional(),
        })

        export const AI = Base.extend({
            role: configLiteral("ai"),
            data: z.object({
                isProcessing: z.boolean(),
                tool_calls: z.array(ToolCall.Schema).optional(),
            }),
        })


        export const Tool = Base.extend({
            role: configLiteral("tool"),
            data: z.object({
                tool_call_id: ToolCall.Id,
                tool_name: z.string(),
                status: ToolCall.Status,
                error: z.string().optional(),
            }),
        })

        export const System = Base.extend({
            role: configLiteral("system"),
            data: z.object({}).optional(),
        })

        export interface AI extends z.infer<typeof Message.AI> { }
        export interface Tool extends z.infer<typeof Message.Tool> { }
        export interface System extends z.infer<typeof Message.System> { }
        export interface User extends z.infer<typeof Message.User> { }

        export const Schema = z.discriminatedUnion("role", [
            Message.User,
            Message.AI,
            Message.Tool,
            Message.System,
        ])
    }
    export type Message = z.infer<typeof Message.Schema>

    export const Schema = z.object({
        id: Chat.Id,
        name: z.string(),
        workflow_id: Workflow.Id,
        created_at: z.iso.datetime(),
        updated_at: z.iso.datetime(),
        execution_session_id: z.lazy(() => ExecutionSession.Id)
    })

    export namespace Event {
        export function getTopic(chatId: Chat.Id) {
            return `chat:${chatId}` as Realtime.Topic
        }

        const Base = Realtime.Event.Base.extend({
            chatId: Chat.Id,
        })

        export namespace ResponseCreated {
            export const Schema = Base.extend({
                type: z.literal("response:created"),
                responseMessage: Message.AI
            })
        }
        export type ResponseCreated = z.infer<typeof ResponseCreated.Schema>

        export namespace ResponseChunk {
            export const Schema = Base.extend({
                type: z.literal("response:chunk"),
                content: z.string(),
                responseMessageId: Message.Id,
            })
        }
        export type ResponseChunk = z.infer<typeof ResponseChunk.Schema>

        export namespace ResponseFinished {
            export const Schema = Base.extend({
                type: z.literal("response:finished"),
                responseMessageId: Message.Id,
                finalContent: z.string(),
            })
        }
        export type ResponseFinished = z.infer<typeof ResponseFinished.Schema>

        export const Schema = z.discriminatedUnion("type", [
            ResponseCreated.Schema,
            ResponseChunk.Schema,
            ResponseFinished.Schema,
        ])
    }
    export type Event = z.infer<typeof Event.Schema>

    export namespace API {
        export namespace Message {
            export namespace Send {
                export const Request = z.lazy(() => z.object({
                    message: Chat.Message.User,
                }))
                export type Request = z.infer<typeof Request>

                export const Response = z.object({})
                export type Response = z.infer<typeof Response>
            }
            export async function send(api: AxiosInstance, req: Send.Request): Promise<Message.Send.Response> {
                const { data } = await api.post<Send.Response>(
                    "/api/chat/message/send", req
                )
                return data
            }


            export namespace Respond {
                export const Request = z.object({
                    responseMessage: Chat.Message.AI,
                })
                export type Request = z.infer<typeof Request>

                export const Response = z.object({})
                export type Response = z.infer<typeof Response>
            }
            export async function respond(api: AxiosInstance, req: Respond.Request): Promise<Respond.Response> {
                const { data } = await api.post<Respond.Response>(
                    "/api/chat/message/respond", req
                )
                return data
            }


            export namespace Update {
                export const Request = z.object({
                    messageId: Chat.Message.Id,
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
                    messageId: Chat.Message.Id,
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
                    chatId: Chat.Id,
                    jobId: z.string().brand("JobId")
                })
                export type Request = z.infer<typeof Request>
            }
            export async function streamOutput(supabase: SupabaseClient, api_base_url: string, req: StreamOutput.Request): Promise<Response> {
                const { data } = await supabase.auth.getSession();
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
                    responseMessage: Chat.Message.AI,
                    jobId: z.string().brand("JobId")
                })
                export type Request = z.infer<typeof Request>
            }
            export async function streamResponse(supabase: SupabaseClient, api_base_url: string, req: StreamResponse.Request): Promise<Response> {
                const { data } = await supabase.auth.getSession();
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

        export namespace Erase {
            export const Request = z.object({
                chatId: Chat.Id,
            })
            export type Request = z.infer<typeof Request>

            export const Response = z.object({})
            export type Response = z.infer<typeof Response>
        }
        export async function erase(api: AxiosInstance, req: Erase.Request): Promise<Erase.Response> {
            const { data } = await api.post<Erase.Response>(
                "/api/chat/erase", req
            )
            return data
        }

        export namespace Create {
            export const Request = z.object({
                workflow_id: Workflow.Id,
                name: z.string().optional(),
                execution_session: z.lazy(() => ExecutionSession.Schema)
            })
            export type Request = z.infer<typeof Request>

            export const Response = z.object({
                chat: Chat.Schema
            })
            export type Response = z.infer<typeof Response>
        }
        export async function create(api: AxiosInstance, req: Create.Request): Promise<Create.Response> {
            const { data } = await api.post<Create.Response>(
                "/api/chat/create", req
            )
            return data
        }

        export namespace Get {
            export const Request = z.object({
                chatId: Chat.Id,
                cursor: Chat.Message.Id.optional(),
                limit: z.number().int().positive().default(50).optional(),
            })
            export type Request = z.infer<typeof Request>

            export const Response = z.object({
                chat: Chat.Schema,
                messages: z.array(Chat.Message.Schema),
            })
            export type Response = z.infer<typeof Response>
        }
        export async function get(api: AxiosInstance, req: Get.Request): Promise<Get.Response> {
            const { data } = await api.post<Get.Response>(
                "/api/chat/get", req
            )
            return data
        }


        export namespace List {
            export const Request = z.object({})
            export type Request = z.infer<typeof Request>

            export const Response = z.object({
                chats: z.array(Chat.Schema),
            })
            export type Response = z.infer<typeof Response>
        }
        export async function list(api: AxiosInstance, req: List.Request): Promise<List.Response> {
            const { data } = await api.post<List.Response>(
                "/api/chat/list", req
            )
            return data
        }
    }
}
export type Chat = z.infer<typeof Chat.Schema>