import z from "zod"
import { Workflow } from "../Workflow"
import { Port } from "../Foundations/Port"
import { SystemError } from "../SystemError"
import { Realtime } from "../Realtime"
import { ExecutionId } from "./ids"
import { Session } from "./session"
import { Recording as RecordingModule } from "./recording"

// ─── Events ───────────────────────────────────────────────────────────────
// Single channel per execution: execution:<executionId>
// Carries both lifecycle events and per-node progress events.

export namespace Event {
    export const Channel = Realtime.Channel.brand("ExecutionChannel")
    export type Channel = z.infer<typeof Channel>

    export const getChannel = (executionId: ExecutionId) =>
        `execution:${executionId}` as Channel

    const Base = Realtime.Event.Base.extend({
        executionId: ExecutionId,
        workflowId:  Workflow.Id,
        channel:     Channel,
    })

    // Lifecycle
    export const Started    = Base.extend({ type: z.literal('started') })
    export const Paused     = Base.extend({ type: z.literal('paused'), session: Session.Schema })
    export const Resumed    = Base.extend({ type: z.literal('resumed'), session: Session.Schema })
    export const Completed  = Base.extend({ type: z.literal('completed'), session: Session.Schema })
    export const Failed     = Base.extend({ type: z.literal('failed'), session: Session.Schema, error: SystemError.Schema })
    export const Suspended  = Base.extend({ type: z.literal('suspended'), session: Session.Schema })
    export const Terminated = Base.extend({ type: z.literal('terminated') })

    // Progress
    export const SessionUpdate = Base.extend({
        type:          z.literal('update'),
        sessionUpdate: Session.Update,
    })

    export namespace Node {
        export const Started   = Base.extend({
            type:          z.literal('node:started'),
            nodeId:        Workflow.Node.Id,
            sessionUpdate: Session.Update,
        })
        export const Completed = Base.extend({
            type:          z.literal('node:completed'),
            nodeId:        Workflow.Node.Id,
            output:        z.unknown(),
            sessionUpdate: Session.Update,
        })
        export const Error     = Base.extend({
            type:          z.literal('node:error'),
            nodeId:        Workflow.Node.Id,
            error:         SystemError.Schema,
            sessionUpdate: Session.Update,
        })
        export const Waiting   = Base.extend({
            type:          z.literal('node:waiting'),
            nodeId:        Workflow.Node.Id,
            sessionUpdate: Session.Update,
        })

        export type Started   = z.infer<typeof Started>
        export type Completed = z.infer<typeof Completed>
        export type Error     = z.infer<typeof Error>
        export type Waiting   = z.infer<typeof Waiting>
    }

    export type Started         = z.infer<typeof Started>
    export type Paused          = z.infer<typeof Paused>
    export type Resumed         = z.infer<typeof Resumed>
    export type Suspended       = z.infer<typeof Suspended>
    export type Terminated      = z.infer<typeof Terminated>
    export type Completed       = z.infer<typeof Completed>
    export type Failed          = z.infer<typeof Failed>
    export type SessionUpdate   = z.infer<typeof SessionUpdate>

    // ─── Recording events ────────────────────────────────────────────────
    // Sent on the same execution channel. Frontend applies each as a
    // direct patch to its local recording state.

    export namespace Recording {
        export namespace Unit {
            export const Started = Base.extend({
                type: z.literal("unit:started"),
                unit: RecordingModule.UnitOfWork.Schema,
            })
            export type Started = z.infer<typeof Started>

            export const Completed = Base.extend({
                type:           z.literal("unit:completed"),
                unitId:         RecordingModule.UnitOfWork.Id,
                duration:       z.number(),
                outputSnapshot: z.record(Port.Output.Id, RecordingModule.DataBank.PortSnapshot.Id),
                metrics:        z.record(z.string(), RecordingModule.Metric.Schema).optional(),
            })
            export type Completed = z.infer<typeof Completed>

            export const Failed = Base.extend({
                type:     z.literal("unit:failed"),
                unitId:   RecordingModule.UnitOfWork.Id,
                duration: z.number(),
                metrics:  z.record(z.string(), RecordingModule.Metric.Schema).optional(),
            })
            export type Failed = z.infer<typeof Failed>
        }

        export namespace Relation {
            export const Created = Base.extend({
                type:     z.literal("relation:created"),
                relation: RecordingModule.Relation.Schema,
            })
            export type Created = z.infer<typeof Created>

            export const CreateBatch = Base.extend({
                type:      z.literal("relation:createBatch"),
                relations: z.array(RecordingModule.Relation.Schema),
            })
            export type CreateBatch = z.infer<typeof CreateBatch>
        }

        export const Completed = Base.extend({
            type: z.literal("recording:completed"),
        })
        export type Completed = z.infer<typeof Completed>

        export const FullyUploaded = Base.extend({
            type: z.literal("recording:fullyUploaded"),
        })
        export type FullyUploaded = z.infer<typeof FullyUploaded>
    }

    export const Schema = z.discriminatedUnion("type", [
        Started, Paused, Resumed, Suspended, Terminated, Completed, Failed,
        SessionUpdate,
        Node.Started, Node.Completed, Node.Error, Node.Waiting,
        Recording.Unit.Started, Recording.Unit.Completed, Recording.Unit.Failed,
        Recording.Relation.Created, Recording.Relation.CreateBatch,
        Recording.Completed, Recording.FullyUploaded,
    ])
}
export type Event = z.infer<typeof Event.Schema>
