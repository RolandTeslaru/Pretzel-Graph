import z from "zod"
import { type AxiosInstance } from "axios"
import { supabaseTimestamp } from "./zod-utils"
import { Auth } from "./Auth"
import { Execution } from "./Execution"
import { Workflow } from "./Workflow"
import { Port } from "./Foundations/Port"
import { Projection } from "./Foundations/Projection"
import { Realtime } from "./Realtime"

export namespace Recording {

    export const Id = z.string().brand("ExecutionRecordingId")
    export type Id = z.infer<typeof Id>

    export const createId = (executionId: Execution.Id): Id =>
        `recording:${executionId}:${crypto.randomUUID().slice(0, 8)}` as Id

    // ─── DataBank ────────────────────────────────────────────────────────────
    // Flat store of port value snapshots. One entry per (uow, port) pair.
    // Input snapshots reference the same entries as the source UoW's output
    // snapshots — no duplication across the two.

    export namespace DataBank {
        export namespace PortSnapshot {
            export const Id = z.string().brand("ExecutionRecordingPortSnapshotId")
            export type Id = z.infer<typeof Id>

            // Deterministic — always uowId:portId, no need to pass around separately
            export const formatId = (uowId: UnitOfWork.Id, portId: Port.Id): Id =>
                `${uowId}:${portId}` as Id

            export const Schema = z.object({
                id:     Id,
                portId: Port.Id,
                value:  Projection.Schema,
            })
        }

        export const Schema = z.object({
            snapshots: z.record(PortSnapshot.Id, PortSnapshot.Schema).default({}),
        })
    }
    export type DataBank = z.infer<typeof DataBank.Schema>

    // ─── UnitOfWork ───────────────────────────────────────────────────────────
    // One per node execution. Cyclic nodes produce multiple UoWs on the same
    // track. Times are ms relative to origin (0 = execution start).
    // "waiting" never applies — UoWs are only created when a node actually fires.

    export namespace UnitOfWork {
        export const Id = z.string().brand("ExecutionRecordingUnitOfWorkId")
        export type Id = z.infer<typeof Id>

        export const createId = (nodeId: Workflow.Node.Id): Id =>
            `${nodeId}:${crypto.randomUUID().slice(0, 8)}` as Id

        export const Status = z.enum(["running", "completed", "failed"])
        export type Status = z.infer<typeof Status>

        export const Schema = z.object({
            id:             Id,
            trackId:        Workflow.Node.Id,
            status:         Status,
            startedAt:      z.number(),            // ms from origin
            duration:       z.number().optional(), // ms; undefined while running
            inputSnapshot:  z.record(Port.Input.Id,  DataBank.PortSnapshot.Id).default({}),
            outputSnapshot: z.record(Port.Output.Id, DataBank.PortSnapshot.Id).default({}),
        })
    }
    export type UnitOfWork = z.infer<typeof UnitOfWork.Schema>

    // ─── Track ───────────────────────────────────────────────────────────────
    // One per node. unitIds is append-only in execution order.
    // Ordered in the UI by the startedAt of the first UoW.

    export namespace Track {
        export const Id = Workflow.Node.Id
        export type Id = z.infer<typeof Id>

        export const Schema = z.object({
            id:      Id,
            unitIds: z.array(UnitOfWork.Id).default([]),
        })
    }
    export type Track = z.infer<typeof Track.Schema>

    // ─── Relation ────────────────────────────────────────────────────────────
    // Connects two UoWs via a workflow edge.
    // "signal"      — source directly triggered target this cycle  (solid arrow)
    // "dataRemnant" — source ran in a prior cycle; target read its stale output (dashed arrow)
    // dataSnapshot points to the source UoW's output port snapshot.

    export namespace Relation {
        export const Id = z.string().brand("ExecutionRecordingRelationId")
        export type Id = z.infer<typeof Id>

        export const formatId = (source: UnitOfWork.Id, edgeId: Workflow.Edge.Id, target: UnitOfWork.Id): Id =>
            `${source}:${edgeId}:${target}` as Id

        export const Schema = z.object({
            id:           Id,
            source:       UnitOfWork.Id,
            target:       UnitOfWork.Id,
            edge:         Workflow.Edge.Id,
            type:         z.enum(["signal", "dataRemnant"]),
            dataSnapshotId: DataBank.PortSnapshot.Id,
        })
    }
    export type Relation = z.infer<typeof Relation.Schema>

    // ─── Top-level ───────────────────────────────────────────────────────────

    // Lightweight projection for list views — no heavy blobs.
    export const Meta = z.object({
        id:          Id,
        executionId: Execution.Id,
        workflowId:  Workflow.Id,
        createdAt:   supabaseTimestamp,
    })
    export type Meta = z.infer<typeof Meta>

    export const Schema = Meta.extend({
        workflowDataSnapshot: Workflow.Data.Schema, // workflow state at execution time;
                                                    // insulates the timeline from subsequent edits
        tracks:    z.record(Track.Id,      Track.Schema     ).default({}),
        units:     z.record(UnitOfWork.Id, UnitOfWork.Schema).default({}),
        relations: z.record(Relation.Id,   Relation.Schema  ).default({}),
        dataBank:  DataBank.Schema.default({ snapshots: {} }),
    })

    // ─── Database ────────────────────────────────────────────────────────────
    // Reflects the execution_recordings table structure.
    // Meta fields (id, executionId, workflowId, createdAt) are top-level columns.
    // Heavy fields are stored in the `data` JSONB column.

    export namespace Database {
        export namespace Row {
            export const Schema = z.object({
                id:           Recording.Id,
                execution_id: Execution.Id,
                workflow_id:  Workflow.Id,
                user_id:      Auth.User.Id,
                created_at:   supabaseTimestamp,
                data:         z.object({
                    workflowDataSnapshot: Workflow.Data.Schema,
                    tracks:    z.record(Track.Id,      Track.Schema     ).default({}),
                    units:     z.record(UnitOfWork.Id, UnitOfWork.Schema).default({}),
                    relations: z.record(Relation.Id,   Relation.Schema  ).default({}),
                    dataBank:  DataBank.Schema.default({ snapshots: {} }),
                }),
            })
        }
        export type Row = z.infer<typeof Row.Schema>

        export const fromRow = (row: Row): Recording => ({
            id:          row.id,
            executionId: row.execution_id,
            workflowId:  row.workflow_id,
            createdAt:   row.created_at,
            ...row.data,
        })
    }

    // ─── Streaming events ────────────────────────────────────────────────────
    // Sent on the main execution channel (execution:<executionId>).
    // Frontend applies each event as a direct patch to its local Recording state.

    export namespace Event {
        const Base = Realtime.Event.Base.extend({
            channel:     Execution.Event.Channel,
            executionId: Execution.Id,
        })

        export namespace Unit {
            export const Started = Base.extend({
                type: z.literal("unit:started"),
                unit: UnitOfWork.Schema,
            })
            export type Started = z.infer<typeof Started>

            export const Completed = Base.extend({
                type:           z.literal("unit:completed"),
                unitId:         UnitOfWork.Id,
                duration:       z.number(),
                outputSnapshot: z.record(Port.Output.Id, DataBank.PortSnapshot.Id),
            })
            export type Completed = z.infer<typeof Completed>

            export const Failed = Base.extend({
                type:     z.literal("unit:failed"),
                unitId:   UnitOfWork.Id,
                duration: z.number(),
            })
            export type Failed = z.infer<typeof Failed>
        }

        export namespace Relation {
            export const Created = Base.extend({
                type:     z.literal("relation:created"),
                relation: Recording.Relation.Schema,
            })
            export type Created = z.infer<typeof Created>

            export const CreateBatch = Base.extend({
                type: z.literal("relation:createBatch"),
                relations: z.array(Recording.Relation.Schema),
            })
            export type CreateBatch = z.infer<typeof CreateBatch>
        }

        export const Completed = Base.extend({
            type: z.literal("recording:completed"),
        })
        export type Completed = z.infer<typeof Completed>
        
        export const FullyUploaded = Base.extend({
            type:      z.literal("recording:fullyUploaded"),
        })
        export type FullyUploaded = z.infer<typeof FullyUploaded>

        export const Schema = z.discriminatedUnion("type", [
            Unit.Started,
            Unit.Completed,
            Unit.Failed,
            Relation.Created,
            Relation.CreateBatch,
            Completed,
            FullyUploaded
        ])
    }
    export type Event = z.infer<typeof Event.Schema>

    // ─── Timeline UI constants ───────────────────────────────────────────────
    // Pixel geometry and formatting helpers for the timeline viewer.
    // Kept here so any package that works with Recording data can share them
    // without depending on a UI-layer constants file.

    export namespace Timeline {
        export const UOW_PORT_HEIGHT = 20   // px — height of one port sub-row inside a UoW block
        export const TRACK_PADDING_Y = 3    // px — vertical inset above/below the UoW block within its track row
        export const TRACK_LABEL_W   = 100  // px — width of the track label column
        export const RULER_H         = 28   // px — height of the time ruler header
        export const MIN_BLOCK_W     = 6    // px — minimum rendered width of a completed UoW block
        export const RUNNING_BLOCK_W = 32   // px — fixed width used while a UoW is still running

        export function tickIntervalMs(pixelsPerMs: number): number {
            if (pixelsPerMs >= 2)   return 10
            if (pixelsPerMs >= 0.5) return 100
            if (pixelsPerMs >= 0.1) return 500
            return 1000
        }

        export function formatMs(ms: number): string {
            if (ms >= 1000) return `${(ms / 1000).toFixed(ms % 1000 === 0 ? 0 : 1)}s`
            return `${ms}ms`
        }
    }

    // ─── API ─────────────────────────────────────────────────────────────────
    // All routes live under /api/execution/recording/*.
    // Upsert is internal-only (worker → backend after job completes).

    export namespace API {
        export namespace Upsert {
            export const Request  = z.object({ recording: Recording.Schema })
            export const Response = z.object({})
            export type Request   = z.infer<typeof Request>
            export type Response  = z.infer<typeof Response>
        }
        export async function upsert(api: AxiosInstance, req: Upsert.Request): Promise<Upsert.Response> {
            const { data } = await api.post<Upsert.Response>('/api/execution/recording/upsert', req)
            return data
        }

        export namespace Get {
            export const Request  = z.object({ executionId: Execution.Id })
            export const Response = z.object({ recording: Recording.Schema })
            export type Request   = z.infer<typeof Request>
            export type Response  = z.infer<typeof Response>
        }
        export async function get(api: AxiosInstance, req: Get.Request): Promise<Get.Response> {
            const { data } = await api.post<Get.Response>('/api/execution/recording/get', req)
            return data
        }

        // Reads the ephemeral recording from Redis (written at end of execution, TTL-expiring).
        export namespace GetLive {
            export const Request  = z.object({ executionId: Execution.Id })
            export const Response = z.object({ recording: Recording.Schema })
            export type Request   = z.infer<typeof Request>
            export type Response  = z.infer<typeof Response>
        }
        export async function getLive(api: AxiosInstance, req: GetLive.Request): Promise<GetLive.Response> {
            const { data } = await api.post<GetLive.Response>('/api/execution/recording/get-live', req)
            return data
        }

        export namespace ListByWorkflow {
            export const Request  = z.object({ workflowId: Workflow.Id })
            export const Response = z.object({ recordings: z.array(Recording.Meta) })
            export type Request   = z.infer<typeof Request>
            export type Response  = z.infer<typeof Response>
        }
        export async function listByWorkflow(api: AxiosInstance, req: ListByWorkflow.Request): Promise<ListByWorkflow.Response> {
            const { data } = await api.post<ListByWorkflow.Response>('/api/execution/recording/list-by-workflow', req)
            return data
        }
    }
}

export type Recording = z.infer<typeof Recording.Schema>
