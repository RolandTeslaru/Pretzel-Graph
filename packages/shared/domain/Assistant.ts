import { z } from "zod"
import { Workflow } from "./Workflow"
import { type AxiosInstance } from "axios"
import { type GoTrueClient } from "@supabase/auth-js";
import { Realtime } from "./Realtime";
import { supabaseTimestamp } from "./zod-utils";
import { Auth } from "./Auth";

const ExecutionId = z.uuid().brand("ExecutionId");
type ExecutionId = z.infer<typeof ExecutionId>;

export namespace Assistant {

    export const Id = z.uuid().brand("AssistantId")
    export type Id = z.infer<typeof Id>

    export function createId() {
        return crypto.randomUUID() as Id
    }


    export namespace Attachment {
        export const Id = z.string().brand("AssistantAttachmentId")
        export type Id = z.infer<typeof Attachment.Id>

        export const Schema = z.object({
            id: Attachment.Id,
            url: z.string(),
            name: z.string(),
            mime_type: z.string(),
            size_bytes: z.number(),
            storage_path: z.string(),
            uploaded_at: supabaseTimestamp
        })
    }
    export type Attachment = z.infer<typeof Attachment.Schema>


    export namespace ToolCall {
        export const Id = z.string().brand("AssistantToolCallId")
        export const Schema = z.object({
            id: ToolCall.Id,
            name: z.string(),
            arguments: z.record(z.string(), z.unknown()),
        })
        export const Status = z.enum(["success", "error"])
        export type Status = z.infer<typeof Status>
    }


    export namespace Message {
        export const Id = z.uuid().brand("AssistantMessageId")
        export type Id = z.infer<typeof Message.Id>

        export function createId() {
            return crypto.randomUUID() as Id
        }

        export const Role = z.enum(["human", "ai", "tool", "system"])
        export type Role = z.infer<typeof Role>

        export const Base = z.object({
            id:           Message.Id,
            content:      z.string(),
            assistant_id: Assistant.Id,
            created_at:   supabaseTimestamp,
            updated_at:   supabaseTimestamp.nullish(),
            attachments:  z.record(Attachment.Id, Attachment.Schema).nullish(),
        })

        function configLiteral<T extends Role>(value: T) {
            return z.literal(value);
        }

        export const Human = Base.extend({
            role: configLiteral("human"),
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
        export interface Human extends z.infer<typeof Message.Human> { }

        export const Schema = z.discriminatedUnion("role", [
            Message.Human,
            Message.AI,
            Message.Tool,
            Message.System,
        ])
    }
    export type Message = z.infer<typeof Message.Schema>

    export const Schema = z.object({
        id: Assistant.Id,
        name: z.string(),
        workflow_id: Workflow.Id,
        created_at: supabaseTimestamp,
        updated_at: supabaseTimestamp,
    })

    export namespace Event {
        export const Channel = Realtime.Channel.brand("AssistantChannel");
        export type Channel = z.infer<typeof Channel>

        export function getChannel(assistantId: Assistant.Id) {
            return `assistant:${assistantId}` as Channel
        }

        const Base = Realtime.Event.Base.extend({
            assistantId: Assistant.Id,
        })

        export namespace Message {
            export namespace Added {
                export const Schema = Base.extend({
                    type: z.literal("message:added"),
                    messages: z.array(Assistant.Message.Schema),
                })
            }
            export type Added = z.infer<typeof Schema>

            export namespace Updated {
                export const Schema = Base.extend({
                    type: z.literal("message:updated"),
                    message: Assistant.Message,
                })
            }
            export type Updated = z.infer<typeof Schema>

            export namespace Erased {
                export const Schema = Base.extend({
                    type: z.literal("message:erased"),
                    messageId: Assistant.Message.Id,
                })
            }
            export type Erased = z.infer<typeof Schema>
        }


        export const Schema = z.discriminatedUnion("type", [
            Message.Added.Schema,
            Message.Updated.Schema,
            Message.Erased.Schema,
        ])
    }
    export type Event = z.infer<typeof Event.Schema>


    export namespace Database {
        export namespace Row {
            export const Assistant = Schema.extend({
                created_by: Auth.User.Id.nullable(),
            })
        }
    }

    export namespace Signal {

        export namespace MessageSent {
            export const Channel = Realtime.Channel.brand("Assistant.Signal.MessageSent.Channel")
            export type Channel = z.infer<typeof Channel>

            export const getChannel = (executionId: ExecutionId) => `assistant:message_sent:${executionId}` as Channel

            export const Schema = Realtime.Signal.Base.extend({
                assistantId: Assistant.Id,
                message: Assistant.Message.Schema,
            })
            export type Schema = z.infer<typeof Schema>
        }

        export namespace HumanResponded {
            export const Channel = Realtime.Channel.brand("Assistant.Signal.HumanResponded.Channel")
            export type Channel = z.infer<typeof Channel>

            export const getChannel = (executionId: ExecutionId) => `assistant:human_responded:${executionId}` as Channel

            export const Schema = Realtime.Signal.Base.extend({
                assistantId: Assistant.Id,
                message: Assistant.Message.Human,
            })
        }
    }

    export namespace API {
        export namespace Message {
            export namespace Add {
                export const Request = z.lazy(() => z.object({
                    messages: z.array(Assistant.Message.Schema),
                }))
                export type Request = z.infer<typeof Request>

                export const Response = z.object({})
                export type Response = z.infer<typeof Response>
            }
            export async function add(api: AxiosInstance, req: Add.Request): Promise<Add.Response> {
                const { data } = await api.post<Add.Response>(
                    "/api/assistant/message/add", req
                )
                return data
            }


            export namespace Update {
                export const Request = z.object({
                    messageId: Assistant.Message.Id,
                    content: z.string(),
                })
                export type Request = z.infer<typeof Request>

                export const Response = z.object({})
                export type Response = z.infer<typeof Response>
            }
            export async function update(api: AxiosInstance, req: Update.Request): Promise<Update.Response> {
                const { data } = await api.post<Update.Response>(
                    "/api/assistant/message/update", req
                )
                return data
            }


            export namespace Erase {
                export const Request = z.object({
                    messageId: Assistant.Message.Id,
                })
                export type Request = z.infer<typeof Request>

                export const Response = z.object({})
                export type Response = z.infer<typeof Response>
            }
            export async function erase(api: AxiosInstance, req: Erase.Request): Promise<Message.Erase.Response> {
                const { data } = await api.post<Erase.Response>(
                    "/api/assistant/message/erase", req
                )
                return data
            }

            export namespace StreamOutput {
                export const Request = z.object({
                    assistantId: Assistant.Id,
                    jobId: z.string().brand("JobId")
                })
                export type Request = z.infer<typeof Request>
            }
            export async function streamOutput(auth: GoTrueClient, api_base_url: string, req: StreamOutput.Request): Promise<Response> {
                const { data } = await auth.getSession();
                const token = data.session?.access_token;
                if (!token)
                    throw new Error("No token found");

                const response = await fetch(`${api_base_url}/api/assistant/message/streamOutput`, {
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
                    responseMessage: Assistant.Message.AI,
                    jobId: z.string().brand("JobId")
                })
                export type Request = z.infer<typeof Request>
            }
            export async function streamResponse(auth: GoTrueClient, api_base_url: string, req: StreamResponse.Request): Promise<Response> {
                const { data } = await auth.getSession();
                const token = data.session?.access_token;
                if (!token)
                    throw new Error("No token found");

                const response = await fetch(`${api_base_url}/api/assistant/message/streamResponse`, {
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
                assistantId: Assistant.Id,
            })
            export type Request = z.infer<typeof Request>

            export const Response = z.object({})
            export type Response = z.infer<typeof Response>
        }
        export async function erase(api: AxiosInstance, req: Erase.Request): Promise<Erase.Response> {
            const { data } = await api.post<Erase.Response>(
                "/api/assistant/erase", req
            )
            return data
        }

        export namespace Create {
            export const Request = z.object({
                workflow_id: Workflow.Id,
                name: z.string().optional(),
            })
            export type Request = z.infer<typeof Request>

            export const Response = z.object({
                assistant: Assistant.Schema
            })
            export type Response = z.infer<typeof Response>
        }
        export async function create(api: AxiosInstance, req: Create.Request): Promise<Create.Response> {
            const { data } = await api.post<Create.Response>(
                "/api/assistant/create", req
            )
            return data
        }

        export namespace Ensure {
            export const Request = z.object({
                assistantId: Assistant.Id,
                workflow_id: Workflow.Id,
                name: z.string().optional(),
            })
            export type Request = z.infer<typeof Request>

            export const Response = z.object({
                assistant: Assistant.Schema
            })
            export type Response = z.infer<typeof Response>
        }
        export async function ensure(api: AxiosInstance, req: Ensure.Request): Promise<Ensure.Response> {
            const { data } = await api.post<Ensure.Response>(
                "/api/assistant/ensure", req
            )
            return data
        }

        export namespace Get {
            export const Request = z.object({
                assistantId: Assistant.Id,
                cursor: Assistant.Message.Id.optional(),
                limit: z.number().int().positive().default(50).optional(),
            })
            export type Request = z.infer<typeof Request>

            export const Response = z.object({
                assistant: Assistant.Schema,
                messages: z.array(Assistant.Message.Schema),
            })
            export type Response = z.infer<typeof Response>
        }
        export async function get(api: AxiosInstance, req: Get.Request): Promise<Get.Response> {
            const { data } = await api.post<Get.Response>(
                "/api/assistant/get", req
            )
            return data
        }


        export namespace List {
            export const Request = z.object({})
            export type Request = z.infer<typeof Request>

            export const Response = z.object({
                assistants: z.array(Assistant.Schema),
            })
            export type Response = z.infer<typeof Response>
        }
        export async function list(api: AxiosInstance, req: List.Request): Promise<List.Response> {
            const { data } = await api.post<List.Response>(
                "/api/assistant/list", req
            )
            return data
        }
    }
}
export type Assistant = z.infer<typeof Assistant.Schema>
