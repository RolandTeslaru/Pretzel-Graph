import z from "zod"
import { Workflow } from "../Workflow"
import { supabaseTimestamp } from "../zod-utils"
import { ChatId } from "./ids"

/**
 * Names a chat by where it came from, for one a gateway event opened rather than the editor.
 *
 * The provider comes from the connection definition, and the connection id is in the key so two
 * bots on the same channel keep separate conversations.
 */
export const externalKey = (provider: string, connectionId: string, providerChatId: string) =>
    `${provider}:${connectionId}:${providerChatId}`

export const ChatSchema = z.object({
    id: ChatId,
    name: z.string(),
    workflow_id: Workflow.Id,
    external_key: z.string().nullable(),
    created_at: supabaseTimestamp,
    updated_at: supabaseTimestamp,
})
