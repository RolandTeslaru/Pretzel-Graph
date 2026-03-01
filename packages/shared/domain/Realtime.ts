import { z } from "zod"
import { Orchestrator } from "./Orchestrator"
import { Chat } from "./Chat";

export namespace Realtime {
    export namespace Topic {
        // Examples:
        // job:abc-123:events
        // workflow:wf-001:changes 
        export const Id = z.string().brand("topicId")
        export type Id = z.infer<typeof Id>


        export const forJob = (jobId: Orchestrator.Job.Id) => `job:${jobId}` as Topic.Id;
        export const forChat = (chatId: Chat.Id) => `chat:${chatId}` as Topic.Id
        export const forWorkflow = (workflowId: string) => `workflow:${workflowId}` as Topic.Id
    }

    export namespace Event {
        export const Type = z.string()
        export type Type = z.infer<typeof Type>
        export const Base = z.object({
            topicId: Topic.Id,
            type: Type,
            timestamp: z.number().default(Date.now()),
        })
    }
    export type Event = z.infer<typeof Event.Base>
} 