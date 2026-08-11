import z from "zod"
import { Workflow } from "../Workflow"
import { Port } from "../Foundations/Port"
import { SystemError } from "../SystemError"
import { Session } from "./session"
import { Recording as RecordingModule } from "./recording"
import * as EventBase from "./event-base"

// ─── Events ───────────────────────────────────────────────────────────────
// Single channel per execution: execution:<executionId>
// Carries both lifecycle events and per-node progress events.
//
// Other execution-scoped domains publish their own unions on the same channel by
// extending Base — see Consultation.Event. This union stays Execution's own.

export namespace Event {
    export const Channel = EventBase.Channel
    export type Channel = EventBase.Channel

    export const getChannel = EventBase.getChannel

    export const Base = EventBase.Base
    export type Base = EventBase.Base

    export type Unstamped<T_Event extends Base = Base> = EventBase.Unstamped<T_Event>

    // Lifecycle
    export const Started    = Base.extend({ type: z.literal('started') })
    export const Paused     = Base.extend({ type: z.literal('paused'), session: Session.Schema })
    export const Resumed    = Base.extend({ type: z.literal('resumed'), session: Session.Schema })
    export const Completed  = Base.extend({ type: z.literal('completed'), session: Session.Schema })
    export const Failed     = Base.extend({ type: z.literal('failed'), session: Session.Schema, error: SystemError.Schema })
    export const Suspended  = Base.extend({ type: z.literal('suspended'), session: Session.Schema })
    export const Terminated = Base.extend({ type: z.literal('terminated') })

    // Progress
    export const SessionPatch = Base.extend({
        type:         z.literal('patch'),
        sessionPatch: Session.Patch,
    })

    export namespace Node {
        export const Started   = Base.extend({
            type:          z.literal('node:started'),
            nodeId:        Workflow.Node.Id,
            sessionPatch:  Session.Patch,
        })
        export const Completed = Base.extend({
            type:          z.literal('node:completed'),
            nodeId:        Workflow.Node.Id,
            output:        z.unknown(),
            sessionPatch:  Session.Patch,
        })
        export const Error     = Base.extend({
            type:          z.literal('node:error'),
            nodeId:        Workflow.Node.Id,
            error:         SystemError.Schema,
            sessionPatch:  Session.Patch,
        })
        export const Waiting   = Base.extend({
            type:          z.literal('node:waiting'),
            nodeId:        Workflow.Node.Id,
            sessionPatch:  Session.Patch,
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
    export type SessionPatch    = z.infer<typeof SessionPatch>

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
        SessionPatch,
        Node.Started, Node.Completed, Node.Error, Node.Waiting,
        Recording.Unit.Started, Recording.Unit.Completed, Recording.Unit.Failed,
        Recording.Relation.Created, Recording.Relation.CreateBatch,
        Recording.Completed, Recording.FullyUploaded,
    ])

    // Returns an unstamped member — realtimeAPI.emit writes channel/executionId/workflowId from the
    // execution it is bound to, so a caller cannot address another one.
    export const create = EventBase.defineEventFactory(Schema)
}
export type Event = z.infer<typeof Event.Schema>
