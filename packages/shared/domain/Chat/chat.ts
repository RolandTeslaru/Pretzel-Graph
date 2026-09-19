import z from "zod"
import { Workflow } from "../Workflow"
import { supabaseTimestamp } from "../zod-utils"
import { ChatId } from "./ids"

export const ChatSchema = z.object({
    id: ChatId,
    name: z.string(),
    workflow_id: Workflow.Id,
    created_at: supabaseTimestamp,
    updated_at: supabaseTimestamp,
})
