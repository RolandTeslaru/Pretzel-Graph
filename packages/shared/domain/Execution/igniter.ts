import z from "zod"
import { Workflow } from "../Workflow"
import { supabaseTimestamp } from "../zod-utils"
import { Chat } from "../Chat"

// ─── Igniter ──────────────────────────────────────────────────────────────
// What kicked off the execution. Replaces the old Trigger + Igniter split.

export namespace Igniter {

    export const Base = z.object({
        record: z.boolean().optional(),
        debug: z.boolean().optional(),
        chat_id: Chat.Id.optional(),
    })

    export const WorkbenchManual = Base.extend({
        variant: z.literal("workbench_manual"),
    })

    // Partial "run to here" from the editor. Executes only `targetNodeId` and the
    // minimal upstream sub-chain missing from the seeded session; cached upstreams
    // are replayed (fired without re-running). See worker compiler/partial.ts.
    export const WorkbenchStep = Base.extend({
        variant: z.literal("workbench_step"),
        targetNodeId: Workflow.Node.Id,
    })

    // Run from the editor with one igniteable node elected. Igniteable nodes never
    // self-start, so a run that wants one has to name it; that node becomes the
    // start node. Carries no payload — whatever the node waits on arrives out of
    // band, and nothing here knows what kind of node it is.
    export const WorkbenchIgniter = Base.extend({
        variant: z.literal("workbench_igniter"),
        nodeId: Workflow.Node.Id,
    })

    export const SubWorkflow = Base.extend({
        variant: z.literal("sub_workflow"),
        parentNodeId: Workflow.Node.Id,
        subWorkflowPath: z.array(Workflow.Id),
    })

    export const ChatMessage = Base.extend({
        variant: z.literal("chat_message"),
        message: Chat.Message.Schema,
    })

    export const Webhook = Base.extend({
        variant: z.literal("webhook"),
        nodeId: Workflow.Node.Id,
        payload: z.object({
            method:  z.string(),
            path:    z.string(),
            headers: z.record(z.string(), z.unknown()),
            query:   z.record(z.string(), z.unknown()),
            body:    z.unknown(),
        }),
    })

    export const Scheduled = Base.extend({
        variant: z.literal("scheduled"),
        scheduleId:  z.string().optional(),
        scheduledAt: supabaseTimestamp,
    })

    // Added by the api-keys spec.
    export const Sdk = Base.extend({
        variant: z.literal("sdk"),
        inputs: z.record(z.string(), z.unknown()).optional(),
    })

    export const Schema = z.discriminatedUnion("variant", [
        WorkbenchManual,
        WorkbenchStep,
        WorkbenchIgniter,
        SubWorkflow,
        ChatMessage,
        Webhook,
        Scheduled,
        Sdk,
    ])
}
export type Igniter = z.infer<typeof Igniter.Schema>
