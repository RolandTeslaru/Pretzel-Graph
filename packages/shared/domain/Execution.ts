import z from "zod"
import { Workflow } from "./Workflow"
import { supabaseTimestamp } from "./zod-utils"
import { BaseMessage } from "langchain"
import { Port } from "./Foundations/Port"
import { Projection } from "./Foundations/Projection"
import { Chat } from "./Chat"
import { SystemError } from "./SystemError"
import { Auth } from "./Auth"
import { Realtime } from "./Realtime"
import { type AxiosInstance } from "axios"
import { Vault } from "./Vault"
import { Blueprint } from "./Foundations/Blueprint"

export namespace Execution {

    export const Id = z.uuid().brand("ExecutionId")
    export type Id = z.infer<typeof Id>
    export const createId = () => crypto.randomUUID() as Id

    export const Status = z.enum([
        "pending", "running", "paused", "suspended",
        "completed", "failed", "terminated"
    ])
    export type Status = z.infer<typeof Status>

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

    // ─── Igniter ──────────────────────────────────────────────────────────────
    // What kicked off the execution. Replaces the old Trigger + Igniter split.

    export namespace Igniter {

        export const Base = z.object({
            record: z.boolean().optional(),
            debug: z.boolean().optional(),
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
            SubWorkflow,
            ChatMessage,
            Webhook,
            Scheduled,
            Sdk,
        ])
    }
    export type Igniter = z.infer<typeof Igniter.Schema>

    // ─── Queue ────────────────────────────────────────────────────────────────

    
    export namespace Queue {
        export const ID = 'workflow-execution'
        export const Item = z.object({
            execution:           Execution.Schema,
            workflowId:          Workflow.Id,
            workflowData:        Workflow.Data.Schema,
            credentialInstances: z.record(Vault.Credential.Instance.Id, Vault.Credential.Instance.Schema),
        })
        export type Item = z.infer<typeof Item>
    }

    // ─── Recording ────────────────────────────────────────────────────────────
    // Per-execution flight recorder data. 1:1 with Execution — identified by
    // the execution's own id. Embedded as a nullable JSONB column on the
    // executions row, so the recording lifecycle rides on the execution's.

    export namespace Recording {

        // Default Redis TTL for the post-finalisation live cache.
        // The cache is only the "fresh read after recording:fullyUploaded"
        // path — Supabase is authoritative beyond that window.
        export const LIVE_TTL_SECONDS = 300

        // ─── DataBank ────────────────────────────────────────────────────────
        // Flat store of port value snapshots. One entry per (uow, port) pair.
        // Input snapshots reference the same entries as the source UoW's
        // output snapshots — no duplication across the two.

        export namespace DataBank {
            export namespace PortSnapshot {
                export const Id = z.string().brand("Execution.Recording.PortSnapshot.Id")
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

        // ─── Metric ──────────────────────────────────────────────────────────
        // Node-defined per-UoW measurement. Renderer formats by `type`; `value`
        // is the raw number/string. Nodes return `Record<string, Metric>` from
        // `onRecordMetrics` — the key is the stable programmatic identifier,
        // displayName is purely cosmetic.

        export namespace Metric {
            export const Type = z.enum([
                "number",
                "string",
                "duration_ms",
                "currency_usd",
                "tokens",
            ])
            export type Type = z.infer<typeof Type>

            export const Schema = z.object({
                displayName: z.string(),
                value:       z.union([z.string(), z.number()]),
                type:        Type,
            })
        }
        export type Metric = z.infer<typeof Metric.Schema>

        // ─── UnitOfWork ──────────────────────────────────────────────────────
        // One per node execution. Cyclic nodes produce multiple UoWs on the
        // same track. Times are ms relative to origin (0 = execution start).

        export namespace UnitOfWork {
            export const Id = z.string().brand("Execution.Recording.UnitOfWork.Id")
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
                fieldSnapshot:  z.record(z.string(), z.unknown()).optional(),
                metrics:        z.record(z.string(), Metric.Schema).optional(),
            })
        }
        export type UnitOfWork = z.infer<typeof UnitOfWork.Schema>

        // ─── Track ───────────────────────────────────────────────────────────
        // One per node. unitIds is append-only in execution order.

        export namespace Track {
            export const Id = Workflow.Node.Id
            export type Id = z.infer<typeof Id>

            export const Schema = z.object({
                id:      Id,
                unitIds: z.array(UnitOfWork.Id).default([]),
            })
        }
        export type Track = z.infer<typeof Track.Schema>

        // ─── Relation ────────────────────────────────────────────────────────
        // Connects two UoWs via a workflow edge.
        // "signal"      — source directly triggered target this cycle  (solid arrow)
        // "dataRemnant" — source ran in a prior cycle; target read its stale output (dashed arrow)

        export namespace Relation {
            export const Id = z.string().brand("Execution.Recording.Relation.Id")
            export type Id = z.infer<typeof Id>

            export const formatId = (source: UnitOfWork.Id, edgeId: Workflow.Edge.Id, target: UnitOfWork.Id): Id =>
                `${source}:${edgeId}:${target}` as Id

            export const Schema = z.object({
                id:             Id,
                source:         UnitOfWork.Id,
                target:         UnitOfWork.Id,
                edge:           Workflow.Edge.Id,
                type:           z.enum(["signal", "dataRemnant"]),
                dataSnapshotId: DataBank.PortSnapshot.Id,
            })
        }
        export type Relation = z.infer<typeof Relation.Schema>

        // ─── Schema ──────────────────────────────────────────────────────────
        // The embedded payload. id/executionId/workflowId/createdAt are NOT
        // here — they're on the parent Execution row.

        export const Schema = z.object({
            workflowDataSnapshot: Workflow.Data.Schema, // workflow state at execution time;
                                                        // insulates the timeline from subsequent edits
            tracks:    z.record(Track.Id,      Track.Schema     ).default({}),
            units:     z.record(UnitOfWork.Id, UnitOfWork.Schema).default({}),
            relations: z.record(Relation.Id,   Relation.Schema  ).default({}),
            dataBank:  DataBank.Schema.default({ snapshots: {} }),
        })

        // ─── Timeline UI constants ───────────────────────────────────────────
        // Pixel geometry and formatting helpers for the timeline viewer.

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
    }
    export type Recording = z.infer<typeof Recording.Schema>

    // ─── Top-level entity ─────────────────────────────────────────────────────
    // Execution = Job + Session collapsed into one record.
    // recording is nullable — only populated when igniter.record === true.
    // NEVER `SELECT *` from the executions table — recording can be large.

    export const Schema = z.object({
        id:          Id,
        workflow_id: Workflow.Id,
        igniter:     Igniter.Schema,
        status:      Status,
        duration:    z.number(),
        error:       SystemError.Schema.nullish(),
        session:     Session.Schema,     // embedded; no separate id
        recording:   Recording.Schema.nullable().default(null),
        chat_id:     Chat.Id.nullish(), // if applicable
        created_at:  supabaseTimestamp,
        updated_at:  supabaseTimestamp,
    })

    export namespace Database {
        export namespace Row {
            export const Schema = Execution.Schema.extend({
                user_id: Auth.User.Id,
            })
        }
        export type Row = z.infer<typeof Schema>
    }

    // Lightweight projection for list views — omits the heavy session + recording blobs.
    // has_recording is a derived boolean: true when the recording column is non-null.
    // The actual recording payload is never sent; the backend computes this flag and
    // Zod strips the raw recording column before the response leaves the service.
    export const Meta = Schema.omit({ session: true, recording: true }).extend({
        has_recording: z.boolean(),
    })
    export type Meta = z.infer<typeof Meta>


    // ─── Events ───────────────────────────────────────────────────────────────
    // Single channel per execution: execution:<executionId>
    // Carries both lifecycle events and per-node progress events.

    export namespace Event {
        export const Channel = Realtime.Channel.brand("ExecutionChannel")
        export type Channel = z.infer<typeof Channel>

        export const getChannel = (executionId: Execution.Id) =>
            `execution:${executionId}` as Channel

        const Base = Realtime.Event.Base.extend({
            executionId: Execution.Id,
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
                    unit: Execution.Recording.UnitOfWork.Schema,
                })
                export type Started = z.infer<typeof Started>

                export const Completed = Base.extend({
                    type:           z.literal("unit:completed"),
                    unitId:         Execution.Recording.UnitOfWork.Id,
                    duration:       z.number(),
                    outputSnapshot: z.record(Port.Output.Id, Execution.Recording.DataBank.PortSnapshot.Id),
                    metrics:        z.record(z.string(), Execution.Recording.Metric.Schema).optional(),
                })
                export type Completed = z.infer<typeof Completed>

                export const Failed = Base.extend({
                    type:     z.literal("unit:failed"),
                    unitId:   Execution.Recording.UnitOfWork.Id,
                    duration: z.number(),
                    metrics:  z.record(z.string(), Execution.Recording.Metric.Schema).optional(),
                })
                export type Failed = z.infer<typeof Failed>
            }

            export namespace Relation {
                export const Created = Base.extend({
                    type:     z.literal("relation:created"),
                    relation: Execution.Recording.Relation.Schema,
                })
                export type Created = z.infer<typeof Created>

                export const CreateBatch = Base.extend({
                    type:      z.literal("relation:createBatch"),
                    relations: z.array(Execution.Recording.Relation.Schema),
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

    // ─── Signals ──────────────────────────────────────────────────────────────
    // Single signal channel per execution: execution:<executionId>:signal

    export namespace Signal {
        export const Channel = Realtime.Channel.brand("Execution.Signal.Channel")
        export type Channel = z.infer<typeof Channel>

        export const getChannel = (executionId: Execution.Id) =>
            `execution:${executionId}:signal` as Channel

        const Base = Realtime.Signal.Base.extend({ executionId: Execution.Id })

        export const Terminate = Base.extend({ type: z.literal("terminate") })
        export const Pause     = Base.extend({ type: z.literal("pause") })
        export const Resume    = Base.extend({ type: z.literal("resume") })
        export const Suspend   = Base.extend({ type: z.literal("suspend") })
        export const Heartbeat = Base.extend({ type: z.literal("heartbeat") })

        export type Terminate = z.infer<typeof Terminate>
        export type Pause     = z.infer<typeof Pause>
        export type Resume    = z.infer<typeof Resume>
        export type Suspend   = z.infer<typeof Suspend>
        export type Heartbeat = z.infer<typeof Heartbeat>

        export const Schema = z.discriminatedUnion("type", [
            Terminate, Pause, Resume, Suspend, Heartbeat,
        ])
    }
    export type Signal = z.infer<typeof Signal.Schema>

    export namespace API {

        export namespace Run {
            export const Request = z.object({
                workflowId:   Workflow.Id,
                workflowData: Workflow.Data.Schema,
                executionId:  Execution.Id.optional(),
                igniter:      Igniter.Schema,
                chat_id:      Chat.Id.optional(),
            })
            export type Request = z.infer<typeof Request>

            export const InternalRequest = Request
            export type InternalRequest = z.infer<typeof InternalRequest>

            export const Response = z.object({
                execution: Execution.Schema,
                isRecording: z.boolean(),
            })
            export type Response = z.infer<typeof Response>
        }
        export namespace SdkRun {
            export const Request = z.object({
                workflowId: Workflow.Id,
                inputs:     z.record(z.string(), z.unknown()).optional(),
                await:      z.boolean().optional(),
            })
            export type Request = z.infer<typeof Request>

            // await=true → full execution (same as Run.Response); await=false → just the id
            export const Response = z.union([
                z.object({ execution: Execution.Schema }),
                z.object({ executionId: Execution.Id }),
            ])
            export type Response = z.infer<typeof Response>
        }

        export async function run(api: AxiosInstance, req: Run.Request): Promise<Run.Response> {
            const { data } = await api.post<Run.Response>('/api/execution/run', req)
            return data
        }

        export async function runInternal(api: AxiosInstance, req: Run.InternalRequest): Promise<Run.Response> {
            const { data } = await api.post<Run.Response>('/api/execution/internal/run', req)
            return data
        }

        export async function sdkRun(api: AxiosInstance, req: SdkRun.Request): Promise<SdkRun.Response> {
            const { data } = await api.post<SdkRun.Response>('/api/execution/sdk/run', req)
            return data
        }

        export namespace Pause {
            export const Request = z.object({ executionId: Execution.Id })
            export type Request = z.infer<typeof Request>
            export const Response = z.object({ success: z.boolean() })
            export type Response = z.infer<typeof Response>
        }

        export async function pause(api: AxiosInstance, req: Pause.Request): Promise<Pause.Response> {
            const { data } = await api.post<Pause.Response>('/api/execution/pause', req)
            return data
        }

        export namespace Resume {
            export const Request = z.object({ executionId: Execution.Id })
            export type Request = z.infer<typeof Request>
            export const Response = z.object({ success: z.boolean() })
            export type Response = z.infer<typeof Response>
        }

        export async function resume(api: AxiosInstance, req: Resume.Request): Promise<Resume.Response> {
            const { data } = await api.post<Resume.Response>('/api/execution/resume', req)
            return data
        }

        export namespace Suspend {
            export const Request = z.object({ executionId: Execution.Id })
            export type Request = z.infer<typeof Request>
            export const Response = z.object({ success: z.boolean() })
            export type Response = z.infer<typeof Response>
        }

        export async function suspend(api: AxiosInstance, req: Suspend.Request): Promise<Suspend.Response> {
            const { data } = await api.post<Suspend.Response>('/api/execution/suspend', req)
            return data
        }

        export namespace Terminate {
            export const Request = z.object({ executionId: Execution.Id })
            export type Request = z.infer<typeof Request>
            export const Response = z.object({ success: z.boolean() })
            export type Response = z.infer<typeof Response>
        }

        export async function terminate(api: AxiosInstance, req: Terminate.Request): Promise<Terminate.Response> {
            const { data } = await api.post<Terminate.Response>('/api/execution/terminate', req)
            return data
        }

        export namespace Heartbeat {
            export const Request = z.object({ executionId: Execution.Id })
            export type Request = z.infer<typeof Request>
            export const Response = z.object({})
            export type Response = z.infer<typeof Response>
        }

        export async function heartbeat(api: AxiosInstance, req: Heartbeat.Request): Promise<Heartbeat.Response> {
            const { data } = await api.post<Heartbeat.Response>('/api/execution/heartbeat', req)
            return data
        }

        export namespace Finalise {
            export const Request = z.object({
                executionId: Execution.Id,
                status:      Execution.Status,
            })
            export type Request = z.infer<typeof Request>
            export const Response = z.object({})
            export type Response = z.infer<typeof Response>
        }

        export async function finalise(api: AxiosInstance, req: Finalise.Request): Promise<Finalise.Response> {
            const { data } = await api.post<Finalise.Response>('/api/execution/finalise', req)
            return data
        }

        export namespace TerminateAll {
            export const Request = z.object({})
            export type Request = z.infer<typeof Request>
            export const Response = z.object({ terminatedCount: z.number() })
            export type Response = z.infer<typeof Response>
        }

        export async function terminateAll(api: AxiosInstance): Promise<TerminateAll.Response> {
            const { data } = await api.post<TerminateAll.Response>('/api/execution/terminate-all')
            return data
        }

        export namespace Get {
            export const Request = z.object({ executionId: Execution.Id })
            export type Request = z.infer<typeof Request>
            export const Response = z.object({ execution: Execution.Schema })
            export type Response = z.infer<typeof Response>
        }

        export async function get(api: AxiosInstance, req: Get.Request): Promise<Get.Response> {
            const { data } = await api.post<Get.Response>('/api/execution/get', req)
            return data
        }

        export namespace Update {
            export const Request = z.object({
                executionId: Execution.Id,
                status:      Status.optional(),
                session:     Session.Update.optional(),
                recording:   Execution.Recording.Schema.nullable().optional(),
            })
            export type Request = z.infer<typeof Request>
            export const Response = z.object({})
            export type Response = z.infer<typeof Response>
        }

        export async function update(api: AxiosInstance, req: Update.Request): Promise<Update.Response> {
            const { data } = await api.post<Update.Response>('/api/execution/update', req)
            return data
        }

        // Reads the ephemeral recording from Redis (written at end of execution,
        // TTL-expiring). Use this immediately after a `recording:fullyUploaded`
        // event to reconcile any missed event patches. Supabase is authoritative
        // beyond the TTL window — fall back to Execution.API.get for old runs.
        export namespace Recording {
            export namespace GetLive {
                export const Request  = z.object({ executionId: Execution.Id })
                export const Response = z.object({ recording: Execution.Recording.Schema })
                export type Request   = z.infer<typeof Request>
                export type Response  = z.infer<typeof Response>
            }
            export async function getLive(api: AxiosInstance, req: GetLive.Request): Promise<GetLive.Response> {
                const { data } = await api.post<GetLive.Response>('/api/execution/recording/get-live', req)
                return data
            }
        }

        export namespace Meta {
            export namespace List {
                export const Request = z.object({ workflowId: Workflow.Id })
                export type Request = z.infer<typeof Request>
                export const Response = z.object({ executions: z.array(Execution.Meta) })
                export type Response = z.infer<typeof Response>
            }
            export async function list(api: AxiosInstance, req: List.Request): Promise<List.Response> {
                const { data } = await api.post<List.Response>('/api/execution/meta/list', req)
                return data
            }

            export namespace Get {
                export const Request = z.object({ executionId: Execution.Id })
                export type Request = z.infer<typeof Request>
                export const Response = z.object({ execution: Execution.Meta })
                export type Response = z.infer<typeof Response>
            }
            export async function get(api: AxiosInstance, req: Get.Request): Promise<Get.Response> {
                const { data } = await api.post<Get.Response>('/api/execution/meta/get', req)
                return data
            }

            export namespace ListActive {
                export const Request = z.object({})
                export type Request = z.infer<typeof Request>
                export const Response = z.object({ executions: z.array(Execution.Meta) })
                export type Response = z.infer<typeof Response>
            }
        }
    }
}

export type Execution = z.infer<typeof Execution.Schema>
