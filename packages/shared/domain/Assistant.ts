import { z } from "zod"
import { Workflow } from "./Workflow"
import { type AxiosInstance } from "axios"
import { type GoTrueClient } from "@supabase/auth-js";
import { Realtime } from "./Realtime";
import { supabaseTimestamp } from "./zod-utils";
import { Auth } from "./Auth";
import { Chat } from "./Chat";

const ExecutionId = z.uuid().brand("ExecutionId");
type ExecutionId = z.infer<typeof ExecutionId>;

export namespace Assistant {

    export const Id = z.uuid().brand("AssistantId")
    export type Id = z.infer<typeof Id>

    export function createId() {
        return crypto.randomUUID() as Id
    }

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
                    messages: z.array(Chat.Message.Schema),
                })
            }
            export type Added = z.infer<typeof Schema>

            export namespace Updated {
                export const Schema = Base.extend({
                    type: z.literal("message:updated"),
                    message: Chat.Message.Schema,
                })
            }
            export type Updated = z.infer<typeof Schema>

            export namespace Erased {
                export const Schema = Base.extend({
                    type: z.literal("message:erased"),
                    messageId: Chat.Message.Id,
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
                message: Chat.Message.Schema,
            })
            export type Schema = z.infer<typeof Schema>
        }

        export namespace HumanResponded {
            export const Channel = Realtime.Channel.brand("Assistant.Signal.HumanResponded.Channel")
            export type Channel = z.infer<typeof Channel>

            export const getChannel = (executionId: ExecutionId) => `assistant:human_responded:${executionId}` as Channel

            export const Schema = Realtime.Signal.Base.extend({
                assistantId: Assistant.Id,
                message: Chat.Message.Human,
            })
        }
    }

    export namespace API {
        export namespace Message {
            export namespace Add {
                export const Request = z.lazy(() => z.object({
                    messages: z.array(Chat.Message.Schema),
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
                    messageId: Chat.Message.Id,
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
                    messageId: Chat.Message.Id,
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
                    responseMessage: Chat.Message.AI,
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
                cursor: Chat.Message.Id.optional(),
                limit: z.number().int().positive().default(50).optional(),
            })
            export type Request = z.infer<typeof Request>

            export const Response = z.object({
                assistant: Assistant.Schema,
                messages: z.array(Chat.Message.Schema),
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
