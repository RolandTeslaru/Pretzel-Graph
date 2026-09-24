import z from "zod"
import { v7 as uuidv7 } from "uuid"
import { supabaseTimestamp } from "../zod-utils"

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
        uploaded_at: supabaseTimestamp
    })
}
export type Attachment = z.infer<typeof Attachment.Schema>


export namespace ToolCall {
    export const Id = z.string().brand("ToolCallId")
    export type Id = z.infer<typeof ToolCall.Id>

    export const Schema = z.object({
        id: ToolCall.Id,
        name: z.string(),
        arguments: z.record(z.string(), z.unknown()),
    })
    export const Invalid = z.object({
        id: z.string().nullish(),
        name: z.string().nullish(),
        args: z.string().nullish(),
        error: z.string().nullish(),
    })
    export const Status = z.enum(["success", "error"])
    export type Status = z.infer<typeof Status>
}

export const UsageMetadata = z.object({
    input_tokens: z.number(),
    output_tokens: z.number(),
    total_tokens: z.number(),
    input_token_details: z.record(z.string(), z.number()).optional(),
    output_token_details: z.record(z.string(), z.number()).optional(),
}).loose()
export type UsageMetadata = z.infer<typeof UsageMetadata>


export namespace Message {
    export const Id = z.uuid().brand("MessageId")
    export type Id = z.infer<typeof Message.Id>

    // v7, not v4: ids are the sort key for message order. A batch is written in one
    // insert where every row shares `created_at`, so only the id can recover sequence.
    export function createId() {
        return uuidv7() as Id
    }

    export const Role = z.enum(["human", "ai", "tool", "system"])
    export type Role = z.infer<typeof Role>

    export const Base = z.object({
        id:          Message.Id,
        content:     z.string(),
        attachments: z.record(Attachment.Id, Attachment.Schema).nullish(),
    })

    function configLiteral<T extends Role>(value: T) {
        return z.literal(value);
    }

    // Fields common to every LangChain BaseMessage (content lives on Base).
    const LcMeta = {
        name:               z.string().nullish(),
        lc_id:              z.string().nullish(),
        additional_kwargs:  z.record(z.string(), z.unknown()).nullish(),
        response_metadata:  z.record(z.string(), z.unknown()).nullish(),
    }

    export const Human = Base.extend({
        role: configLiteral("human"),
        data: z.object({ ...LcMeta }).optional(),
    })

    export const AI = Base.extend({
        role: configLiteral("ai"),
        data: z.object({
            isProcessing: z.boolean(),
            tool_calls: z.array(ToolCall.Schema).optional(),
            invalid_tool_calls: z.array(ToolCall.Invalid).optional(),
            usage_metadata: UsageMetadata.nullish(),
            ...LcMeta,
        }),
    })


    export const Tool = Base.extend({
        role: configLiteral("tool"),
        data: z.object({
            tool_call_id: ToolCall.Id,
            tool_name: z.string(),
            status: ToolCall.Status,
            error: z.string().optional(),
            artifact: z.unknown().nullish(),
            ...LcMeta,
        }),
    })

    export const System = Base.extend({
        role: configLiteral("system"),
        data: z.object({ ...LcMeta }).optional(),
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
