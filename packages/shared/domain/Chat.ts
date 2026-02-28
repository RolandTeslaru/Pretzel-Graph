import { z } from "zod"

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

        export const Base = z.object({
            id: Message.Id,
            content: z.string(),
            created_at: z.iso.datetime(),
            updated_at: z.iso.datetime(),
            attachments: z.record(Attachment.Id, Attachment.Schema).optional(),
        })
        
        function configLiteral<T extends Role>(value: T) {
            return z.literal(value);
        }

        export namespace Derived {
            export const User = Message.Base.extend({
                role: configLiteral("user"),
            })

            export const Assistant = Message.Base.extend({
                tool_calls: z.array(ToolCall.Schema)
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
        }

        export interface Assistant extends z.infer<typeof Message.Derived.Assistant> {}
        export interface Tool extends z.infer<typeof Message.Derived.Tool> {}
        export interface System extends z.infer<typeof Message.Derived.System> {}
        export interface User extends z.infer<typeof Message.Derived.User> {}

        export const Schema = z.discriminatedUnion("role", [
            Message.Derived.User,
            Message.Derived.Assistant,
            Message.Derived.Tool,
            Message.Derived.System,
        ])
    }

        
    export const Meta = z.object({
        id: Chat.Id,
        name: z.string(),
        created_at: z.iso.datetime(),
        updated_at: z.iso.datetime(),
    })
    export type Meta = z.infer<typeof Meta>
    
    
    export const Schema = Meta.extend({
        messages: z.array(Message.Schema),
    })
    export type Schema = z.infer<typeof Schema>


    export namespace Event {
        export namespace MessageChunk {

        }
    }

    export namespace API {
        export namespace Message {
            export namespace Send {
                export const Request = z.object({
                    chatId: Chat.Id,
                    content: z.string(),
                    attachements: z.array(Attachment.Id).optional(),
                })
                export type Request = z.infer<typeof Request>
    
                export const Response = z.object({
                    jobId: z.string().brand("JobId")
                })
                export type Response = z.infer<typeof Response>
            }

            export namespace Delete {
                export const Request = z.object({
                    chatId: Chat.Id,
                })
                export type Request = z.infer<typeof Request>

                export const Response = z.object({})
                export type Response = z.infer<typeof Response>
            }
        }

        export namespace Delete {
            export const Request = z.object({
                chatId: Chat.Id,
            })
            export type Request = z.infer<typeof Request>

            export const Response = z.object({})
            export type Response = z.infer<typeof Response>
        }

        export namespace Create {
            export const Request = z.object({})
            export type Request = z.infer<typeof Request>

            export const Response = z.object({
                chatId: Chat.Id,
            })
            export type Response = z.infer<typeof Response>
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

        
        export namespace List {
            export const Request = z.object({})
            export type Request = z.infer<typeof Request>

            export const Response = z.object({
                chats: z.array(Chat.Meta),
            })
            export type Response = z.infer<typeof Response>
        }
    }
}