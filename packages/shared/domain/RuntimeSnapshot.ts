import { z } from "zod"
import { Workflow } from "./Workflow"
import { Chat } from "./Chat"

export namespace RuntimeSnapshot {

    export const Schema = z.object({
        node_outputs: z.record(Workflow.Node.Id, z.any()).default(() => ({})),
        node_messages: z.record(Workflow.Node.Id, z.string()).default(() => ({})),
        messages: z.array(Chat.Message.Schema).default(() => ([])),
        attachments: z.record(z.string(), Chat.Attachment.Schema).default(() => ({})),
        metadata: z.record(z.string(), z.any()).default(() => ({})),
    })

    export const INITIAL = {
        node_outputs: {},
        node_messages: {},
        messages: [],
        attachments: {},
        metadata: {}
    } as z.infer<typeof Schema>

    export const Update = Schema.partial()
    export type Update = z.infer<typeof Update>
}

export type RuntimeSnapshot = z.infer<typeof RuntimeSnapshot.Schema>