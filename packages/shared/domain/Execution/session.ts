import z from "zod"
import { Workflow } from "../Workflow"
import { Port } from "../Foundations/Port"
import { Projection } from "../Foundations/Projection"
import { SystemError } from "../SystemError"
import { supabaseTimestamp } from "../zod-utils"
import { Consultation } from "../Consultation"

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

        export const IDLE: Type = { status: "idle" }
    }
    export type NodeStatus = z.infer<typeof NodeStatus.Schema>

    export namespace EdgeState {
        export const Schema = z.object({
            status: z.enum(["idle", "preparing", "waiting", "completed"]),
            runCount: z.number().default(0),
        })
        export type Type = z.infer<typeof Schema>

        export const IDLE: Type = { status: "idle", runCount: 0 }
    }
    export type EdgeState = z.infer<typeof EdgeState.Schema>

    export const Schema = z.object({
        node_status: z.record(Workflow.Node.Id, NodeStatus.Schema).default({}),
        edge_state:  z.record(Workflow.Edge.Id, EdgeState.Schema).default({}),
        metadata:    z.record(z.string(), z.any()).default({}),
        pending_consultations:   z.record(Consultation.Id, Consultation.Request).default({}),
        node_output_instances:   z.record(Workflow.Node.Id, z.any()).default({}),
        node_output_projections: z.record(Workflow.Node.Id, z.record(Port.Output.Id, Projection.Schema)).default({}),
    })

    export const Partial = Schema.partial()
    export type Partial = z.infer<typeof Partial>

    // Key removals. Upserting merges (Object.assign) and so can never drop a key, which is
    // why removals travel separately: { pending_consultations: { [id]: true } }.
    export const Deletion = z.object({
        node_status:             z.record(Workflow.Node.Id, z.literal(true)),
        edge_state:              z.record(Workflow.Edge.Id, z.literal(true)),
        metadata:                z.record(z.string(), z.literal(true)),
        pending_consultations:   z.record(Consultation.Id, z.literal(true)),
        node_output_instances:   z.record(Workflow.Node.Id, z.literal(true)),
        node_output_projections: z.record(Workflow.Node.Id, z.literal(true)),
    }).partial()
    export type Deletion = z.infer<typeof Deletion>

    // One partial change set. `upsert` merges keys in, `delete` drops them; a single patch
    // may carry both, and `upsert` is applied first.
    export const Patch = z.object({
        upsert: Partial,
        delete: Deletion,
    }).partial()
    export type Patch = z.infer<typeof Patch>

    export const createInitial = () => Schema.parse({})
}
export type Session = z.infer<typeof Session.Schema>
