import z from "zod"
import { Workflow } from "../Workflow"
import { Port } from "../Foundations/Port"
import { Projection } from "../Foundations/Projection"
import { SystemError } from "../SystemError"
import { supabaseTimestamp } from "../zod-utils"

// ─── Session ──────────────────────────────────────────────────────────────
// Embedded runtime-state blob. No separate id — identified by the execution's id.

export namespace Session {

    export namespace NodeStatus {
        export const Schema = z.object({
            status: z.enum(["idle", "running", "completed", "waiting", "failed"]),
            error: SystemError.Schema.optional(),
            started_at: supabaseTimestamp.optional(),
            completed_at: supabaseTimestamp.optional(),
        })
        export type Type = z.infer<typeof Schema>
    }
    export type NodeStatus = z.infer<typeof NodeStatus.Schema>

    export namespace EdgeState {
        export const Schema = z.object({
            status: z.enum(["idle", "preparing", "waiting", "completed"]),
            runCount: z.number().default(0),
        })
        export type Type = z.infer<typeof Schema>
    }
    export type EdgeState = z.infer<typeof EdgeState.Schema>

    export const Schema = z.object({
        node_status: z.record(Workflow.Node.Id, NodeStatus.Schema).default({}),
        edge_state:  z.record(Workflow.Edge.Id, EdgeState.Schema).default({}),
        metadata:    z.record(z.string(), z.any()).default({}),
        node_output_instances:   z.record(Workflow.Node.Id, z.any()).default({}),
        node_output_projections: z.record(Workflow.Node.Id, z.record(Port.Output.Id, Projection.Schema)).default({}),
    })

    export const Update = Schema.partial()
    export type Update = z.infer<typeof Update>

    export const createInitial = () => Schema.parse({})
}
export type Session = z.infer<typeof Session.Schema>
