import z from "zod"
import { Workflow } from "./Workflow"
import { BaseMessage } from "langchain"
import { Port } from "./Foundations/Port"
import { Projection } from "./Foundations/Projection"
import { Chat } from "./Chat"
import { SystemError } from "./SystemError"
import { Auth } from "./Auth"
import { Realtime } from "./Realtime"
import { type AxiosInstance } from "axios"

export namespace Execution {

    export const Id = z.string().brand("ExecutionId")
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
                started_at: z.iso.datetime().optional(),
                completed_at: z.iso.datetime().optional(),
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
            messages:    z.array(z.custom<BaseMessage>((v) => v !== null && typeof v === 'object')).default([]),
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

        export const WorkbenchManual = z.object({
            variant: z.literal("workbench_manual"),
        })

        export const ChatMessage = z.object({
            variant: z.literal("chat_message"),
            message: Chat.Message.Schema,
        })

        export const Webhook = z.object({
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

        export const Scheduled = z.object({
            variant: z.literal("scheduled"),
            scheduleId:  z.string().optional(),
            scheduledAt: z.iso.datetime(),
        })

        // Added by the api-keys spec.
        export const Sdk = z.object({
            variant: z.literal("sdk"),
            inputs: z.record(z.string(), z.unknown()).optional(),
        })

        export const Schema = z.discriminatedUnion("variant", [
            WorkbenchManual,
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
            execution:    Execution.Schema,
            workflowId:   Workflow.Id,
            workflowData: Workflow.Data.Schema,
        })
        export type Item = z.infer<typeof Item>
    }

    // ─── Top-level entity ─────────────────────────────────────────────────────
    // Execution = Job + Session collapsed into one record.

    export const Schema = z.object({
        id:          Id,
        workflow_id: Workflow.Id,
        igniter:     Igniter.Schema,
        status:      Status,
        duration:    z.number(),
        error:       SystemError.Schema.optional(),
        session:     Session.Schema,     // embedded; no separate id
        created_at:  z.iso.datetime(),
        updated_at:  z.iso.datetime(),
    })

    export namespace Database {
        export namespace Row {
            export const Schema = Execution.Schema.extend({
                user_id: Auth.User.Id,
            })   
        }
        export type Row = z.infer<typeof Schema>
    }

    // Lightweight projection for list views — omits the heavy session blob.
    export const Meta = Schema.omit({ session: true })
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
                sessionUpdate: Session.Update.optional(),
            })
            export const Completed = Base.extend({
                type:          z.literal('node:completed'),
                nodeId:        Workflow.Node.Id,
                output:        z.unknown(),
                sessionUpdate: Session.Update.optional(),
            })
            export const Error     = Base.extend({
                type:   z.literal('node:error'),
                nodeId: Workflow.Node.Id,
                error:  SystemError.Schema,
            })
            export const Waiting   = Base.extend({
                type:                    z.literal('node:waiting'),
                nodeId:                  Workflow.Node.Id,
                dependencyResolutionMap: z.record(Workflow.Node.Id, z.boolean()),
                totalDeps:               z.number(),
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

        export const Schema = z.discriminatedUnion("type", [
            Started, Paused, Resumed, Suspended, Terminated, Completed, Failed,
            SessionUpdate,
            Node.Started, Node.Completed, Node.Error, Node.Waiting,
        ])
    }
    export type Event = z.infer<typeof Event.Schema>

    // ─── Signals ──────────────────────────────────────────────────────────────
    // Single signal channel per execution: execution:<executionId>:signal

    export namespace Signal {
        export const Channel = Realtime.Channel.brand("ExecutionSignalChannel")
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
                igniter:      Igniter.Schema.optional(),
            })
            export type Request = z.infer<typeof Request>

            export const InternalRequest = Request
            export type InternalRequest = z.infer<typeof InternalRequest>

            export const Response = z.object({
                execution: Execution.Schema,
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
            })
            export type Request = z.infer<typeof Request>
            export const Response = z.object({})
            export type Response = z.infer<typeof Response>
        }

        export async function update(api: AxiosInstance, req: Update.Request): Promise<Update.Response> {
            const { data } = await api.post<Update.Response>('/api/execution/update', req)
            return data
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
