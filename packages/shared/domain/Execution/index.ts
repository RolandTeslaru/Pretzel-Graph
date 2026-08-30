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

    /** Not finished. Queued, executing, or held part-way through. */
    export const ACTIVE_STATUSES = ["pending", "running", "paused", "suspended"] as const

    /** Finished, however it ended. Nothing more will be written to the row. */
    export const SETTLED_STATUSES = ["completed", "failed", "terminated"] as const

    // Every status belongs to exactly one of the two, so adding one to the enum
    // fails to compile until it is placed.
    type ActiveStatus  = (typeof ACTIVE_STATUSES)[number]
    type SettledStatus = (typeof SETTLED_STATUSES)[number]

    type AssertStatusesPartition =
        Status extends ActiveStatus | SettledStatus
            ? ActiveStatus | SettledStatus extends Status
                ? ActiveStatus & SettledStatus extends never ? true : never
                : never
            : never
    const _assertStatusesPartition: AssertStatusesPartition = true
    void _assertStatusesPartition

    /** Anything carrying a status — a `Meta`, a full row, or a bare `{ status }`. */
    type WithStatus = { status: Status }

    export const isActive = ({ status }: WithStatus): boolean =>
        (ACTIVE_STATUSES as readonly Status[]).includes(status)

    export const isSettled = ({ status }: WithStatus): boolean =>
        (SETTLED_STATUSES as readonly Status[]).includes(status)

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

        export const Claims = z.object({
            executionId: Execution.Id,
            exp:         z.number(),
        })
        export type Claims = z.infer<typeof Claims>

        /**
         * Reads the payload without checking the signature — the signing key is backend-only,
         * so this proves nothing about authenticity. For cross-checking a token against data
         * that travelled beside it; never for authorisation.
         */
        export function decodeUnverified(token: Token): Claims | null {
            const [encoded, signature] = token.split(".")

            if (!encoded || !signature)
                return null

            try {
                const json = atob(encoded.replace(/-/g, "+").replace(/_/g, "/"))
                const parsed = Claims.safeParse(JSON.parse(json))

                return parsed.success ? parsed.data : null
            }
            catch {
                return null
            }
        }
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

    // `igniter` is dropped, not narrowed: a webhook run carries the whole inbound
    // request in it, and nothing reading a Meta wants more than what triggered it.
    export const Meta = Schema.omit({ session: true, recording: true, igniter: true }).extend({
        has_recording:   z.boolean(),
        igniter_variant: Igniter.Variant,
    })
    export type Meta = z.infer<typeof Meta>

    export import Event = EventMod.Event
    export import Signal = SignalMod.Signal

    export namespace API {

        export namespace Run {
            // executionId stays in the body because it is a proposal: the client mints it and
            // subscribes to its channel before the row exists, so there is nothing to authorize
            // against. workflowId is the authorization boundary and travels in the path.
            export const Request = z.strictObject({
                workflowData: Workflow.Data.Schema,
                executionId:  Execution.Id.optional(),
                igniter:      Igniter.Schema,
            })
            export type Request = z.infer<typeof Request>

            // Service-to-service, authenticated as a service rather than a user. It has no user
            // principal to scope against — runFromService derives the owner from the workflow —
            // so the id stays in the body here.
            export const InternalRequest = Request.extend({
                workflowId: Workflow.Id,
            })
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

        export async function run(api: AxiosInstance, workflowId: Workflow.Id, req: Run.Request): Promise<Run.Response> {
            const { data } = await api.post<Run.Response>(`/api/execution/${workflowId}/run`, req)
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

        // The execution is the whole request, and it is now the whole path.
        export namespace Pause {
            export const Response = z.object({ success: z.boolean() })
            export type Response = z.infer<typeof Response>
        }

        export async function pause(api: AxiosInstance, executionId: Execution.Id): Promise<Pause.Response> {
            const { data } = await api.post<Pause.Response>(`/api/execution/${executionId}/pause`, {})
            return data
        }

        // The execution is the whole request, and it is now the whole path.
        export namespace Resume {
            export const Response = z.object({ success: z.boolean() })
            export type Response = z.infer<typeof Response>
        }

        export async function resume(api: AxiosInstance, executionId: Execution.Id): Promise<Resume.Response> {
            const { data } = await api.post<Resume.Response>(`/api/execution/${executionId}/resume`, {})
            return data
        }

        // The execution is the whole request, and it is now the whole path.
        export namespace Suspend {
            export const Response = z.object({ success: z.boolean() })
            export type Response = z.infer<typeof Response>
        }

        export async function suspend(api: AxiosInstance, executionId: Execution.Id): Promise<Suspend.Response> {
            const { data } = await api.post<Suspend.Response>(`/api/execution/${executionId}/suspend`, {})
            return data
        }

        // The execution is the whole request, and it is now the whole path.
        export namespace Terminate {
            export const Response = z.object({ success: z.boolean() })
            export type Response = z.infer<typeof Response>
        }

        export async function terminate(api: AxiosInstance, executionId: Execution.Id): Promise<Terminate.Response> {
            const { data } = await api.post<Terminate.Response>(`/api/execution/${executionId}/terminate`, {})
            return data
        }

        // The execution is the whole request, and it is now the whole path.
        export namespace Heartbeat {
            export const Response = z.object({})
            export type Response = z.infer<typeof Response>
        }

        export async function heartbeat(api: AxiosInstance, executionId: Execution.Id): Promise<Heartbeat.Response> {
            const { data } = await api.post<Heartbeat.Response>(`/api/execution/${executionId}/heartbeat`, {})
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

        // The execution is the whole request, and it is now the whole path.
        export namespace Get {
            export const Response = z.object({ execution: Execution.Schema })
            export type Response = z.infer<typeof Response>
        }

        export async function get(api: AxiosInstance, executionId: Execution.Id): Promise<Get.Response> {
            const { data } = await api.post<Get.Response>(`/api/execution/${executionId}/get`, {})
            return data
        }

        export namespace Update {
            export const Request = z.object({
                executionId: Execution.Id,
                status:      Status.optional(),
                duration:    z.number().optional(),
                // Replaces the whole session column — not merged. Send a complete session.
                session:     Session.Schema.optional(),
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
                export const Response = z.object({ recording: Execution.Recording.Schema })
                export type Request   = z.infer<typeof Request>
                export type Response  = z.infer<typeof Response>
            }
            export async function getLive(api: AxiosInstance, executionId: Execution.Id): Promise<GetLive.Response> {
                const { data } = await api.post<GetLive.Response>(`/api/execution/${executionId}/recording/get-live`, {})
                return data
            }
        }

        export namespace Meta {
            // The workflow was the entire request, and it is now the entire path.
            export namespace List {
                export const Response = z.object({ executions: z.array(Execution.Meta) })
                export type Response = z.infer<typeof Response>
            }
            export async function list(api: AxiosInstance, workflowId: Workflow.Id): Promise<List.Response> {
                const { data } = await api.post<List.Response>(`/api/execution/${workflowId}/meta/list`, {})
                return data
            }

            // The execution is the whole request, and it is now the whole path.
            export namespace Get {
                export const Response = z.object({ execution: Execution.Meta })
                export type Response = z.infer<typeof Response>
            }
            export async function get(api: AxiosInstance, executionId: Execution.Id): Promise<Get.Response> {
                const { data } = await api.post<Get.Response>(`/api/execution/${executionId}/meta/get`, {})
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
