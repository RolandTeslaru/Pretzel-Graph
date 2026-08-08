import z from "zod"
import { type AxiosInstance } from "axios"
import { Workflow } from "../Workflow"
import { supabaseTimestamp } from "../zod-utils"
import { Chat } from "../Chat"
import { SystemError } from "../SystemError"
import { Auth } from "../Auth"
import { Vault } from "../Vault"
import * as RecordingMod from "./recording"
import * as IgniterMod from "./igniter"
import * as SessionMod from "./session"
import * as EventMod from "./event"
import * as SignalMod from "./signal"
import { ExecutionId, createId as createExecutionId } from "./ids"

export namespace Execution {

    export const Id = ExecutionId
    export type Id = ExecutionId
    export const createId = createExecutionId

    export const Status = z.enum([
        "pending", "running", "paused", "suspended",
        "completed", "failed", "terminated"
    ])
    export type Status = z.infer<typeof Status>

    export import Session = SessionMod.Session
    export import Igniter = IgniterMod.Igniter

    /**
     * A per-execution bearer credential: signed at enqueue, presented by the worker on
     * internal routes, and the sole source of the execution id those routes act on.
     *
     * Only the type lives here. sign/verify are in backend/src/auth/execution-token.ts
     * and stay there — they hold EXECUTION_TOKEN_SIGNING_KEY, so the worker can carry a
     * token but has no way to produce one. See SPECS/execution-token-delegation.md.
     */
    export namespace Token {
        export const Schema = z.string().brand("ExecutionToken")

        /** Node lowercases inbound header names — set and read with this exact value. */
        export const HEADER = "execution-token"
    }
    export type Token = z.infer<typeof Token.Schema>

    export namespace Queue {
        export const ID = 'workflow-execution'
        export const Item = z.object({
            execution:           Execution.Schema,
            workflowId:          Workflow.Id,
            workflowData:        Workflow.Data.Schema,
            credentialInstances: z.record(Vault.Credential.Instance.Id, Vault.Credential.Instance.Schema),
            executionToken:      Token.Schema,
        })
        export type Item = z.infer<typeof Item>
    }

    export import Recording = RecordingMod.Recording

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
        created_at:  supabaseTimestamp,
        updated_at:  supabaseTimestamp,
    })

    export const Meta = Schema.omit({ session: true, recording: true }).extend({
        has_recording: z.boolean(),
    })
    export type Meta = z.infer<typeof Meta>

    export import Event = EventMod.Event
    export import Signal = SignalMod.Signal

    export namespace API {

        export namespace Run {
            export const Request = z.object({
                workflowId:   Workflow.Id,
                workflowData: Workflow.Data.Schema,
                executionId:  Execution.Id.optional(),
                igniter:      Igniter.Schema,
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
                duration:    z.number().optional(),
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
