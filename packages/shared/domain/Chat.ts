import { z } from "zod"
import { Workflow } from "./Workflow"
import { Orchestrator } from "./Orchestrator"
import { RuntimeSnapshot } from "./RuntimeSnapshot"
import { AxiosInstance } from "axios"
import { type SupabaseClient } from "@supabase/supabase-js";

export namespace Chat {

    export const Id = z.string().brand("ChatId")
    export type Id = z.infer<typeof Id>

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

        
        export const Role = z.enum(["user", "assistant", "tool", "system"])
        export type Role = z.infer<typeof Role>
       
        export function createId(
            chatId: Chat.Id,
            role: Role
        ) {
            return `${chatId}|${role}|${crypto.randomUUID()}` as Message.Id
        }
        
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

        export const User = Message.Base.extend({
            role: configLiteral("user"),
        })

        export const Assistant = Message.Base.extend({
            role: configLiteral("assistant"),
            isProcessing: z.boolean(),
            tool_calls: z.array(ToolCall.Schema).optional()
        })

        export const Tool = Message.Base.extend({
            role: configLiteral("tool"),
            tool_call_id: ToolCall.Id,
            tool_name: z.string(),
            status: ToolCall.Status,
            error: z.string().optional(),
        })

        export const System = Message.Base.extend({
            role: configLiteral("system"),
        })

        export interface Assistant extends z.infer<typeof Message.Assistant> { }
        export interface Tool extends z.infer<typeof Message.Tool> { }
        export interface System extends z.infer<typeof Message.System> { }
        export interface User extends z.infer<typeof Message.User> { }

        export const Schema = z.discriminatedUnion("role", [
            Message.User,
            Message.Assistant,
            Message.Tool,
            Message.System,
        ])
    }
    export type Message = z.infer<typeof Message.Schema>


    export const Meta = z.object({
        id: Chat.Id,
        name: z.string(),
        workflow_id: Workflow.Id,
        created_at: z.iso.datetime(),
        updated_at: z.iso.datetime(),
    })
    export type Meta = z.infer<typeof Meta>


    export const Schema = Meta.extend({
        messages: z.array(Message.Schema),
    })
    export type Schema = z.infer<typeof Schema>


    export namespace Event {
        export namespace ResponseCreated {
            export const Schema = z.object({
                type: z.literal("response:created"),
                responseMessageId: Message.Id,
            })
        }
        export type ResponseCreated = z.infer<typeof ResponseCreated.Schema>
        
        export namespace MessageChunk {
            export const Schema = z.object({
                type: z.literal("message:chunk"),
                chunk: z.string(),
                targetMessageId: Message.Id,
            })
            export type Schema = z.infer<typeof Schema>
        }
        export type MessageChunk = z.infer<typeof MessageChunk.Schema>
    }

    export namespace API {
        export namespace Message {
            export namespace Send {
                export const Request = z.lazy(() => z.object({
                    message: Chat.Message.Schema,
                    workflow: Workflow.Schema,
                    snapshot: RuntimeSnapshot.Schema
                }))
                export type Request = z.infer<typeof Request>

                export const Response = z.object({
                    jobId: z.string().brand("JobId")
                })
                export type Response = z.infer<typeof Response>
            }
            export async function send(api: AxiosInstance, req: Send.Request): Promise<Message.Send.Response> {
                const { data } = await api.post<Send.Response>(
                    "/api/chat/message/send", req
                )
                return data
            }


            export namespace Erase {
                export const Request = z.object({
                    chatId: Chat.Id,
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
            export const Request = z.object({})
            export type Request = z.infer<typeof Request>

            export const Response = z.object({
                chatId: Chat.Id,
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
            })
            export type Request = z.infer<typeof Request>

            export const Response = z.object({
                chat: Chat.Schema,
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
                chatMetas: z.array(Chat.Meta),
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