import z from "zod"
import { Workflow } from "./Workflow"
import { Auth } from "./Auth"
import { Realtime } from "./Realtime"
import { type AxiosInstance } from "axios"
import { ExecutionSession } from "./ExecutionSession"
import { Chat } from "./Chat"

export namespace Orchestrator {
    export namespace Job {
        export const Id = z.string().brand("JobId")
        export type Id = z.infer<typeof Id>

        export const Status = z.enum(["pending", "running", "paused", "completed", "failed", "terminated"])
        export type Status = z.infer<typeof Status>

        export const Schema = z.object({
            id: Job.Id,
            workflowId: Workflow.Id,
            userId: Auth.User.Id,
            status: Job.Status,
            createdAt: z.date(),
            updatedAt: z.date(),
            duration: z.number(),
        })
    }

    export const EXECUTION_QUEUE_ID = 'workflow-execution'

    export namespace ExecutionQueue {
        export namespace Item {
            export const Schema = z.object({
                jobId: Job.Id,
                workflow: Workflow.Schema,
                userId: Auth.User.Id,
                executionSession: ExecutionSession.Schema
            })
        }
        export type Item = z.infer<typeof Item.Schema>
    }


    // Events are usually emitted by the Aggex Worker
    export namespace Event {
        export const Channel = Realtime.Channel.brand("OrchestratorChannel")
        export type Channel = z.infer<typeof Channel>

        export function getChannel(jobId: Orchestrator.Job.Id) {
            return `job:${jobId}` as Channel
        }

        // Create a base from the realtime event base
        const Base = Realtime.Event.Base.extend({
            jobId: Orchestrator.Job.Id,
            workflowId: Workflow.Id,
            channel: Channel
        })

        export namespace Compilation {
            export const Started = Base.extend({
                type: z.literal('compilation:started'),
            })

            export const Completed = Base.extend({
                type: z.literal('compilation:completed'),
            })

            export const Failed = Base.extend({
                type: z.literal('compilation:failed'),
                error: z.string()
            })

            export type Started = z.infer<typeof Started>
            export type Completed = z.infer<typeof Completed>
            export type Failed = z.infer<typeof Failed>

            export const Schema = z.discriminatedUnion("type", [
                Started,
                Completed,
                Failed,
            ])
        }

        export namespace Job {
            export const Started = Base.extend({
                type: z.literal('started'),
            })

            export const Update = Base.extend({
                type: z.literal('update'),
                update: ExecutionSession.Update
            })


            export const Terminated = Base.extend({
                type: z.literal('terminated'),
            })


            export const Paused = Base.extend({
                type: z.literal('paused'),
            })


            export const Failed = Base.extend({
                type: z.literal('failed'),
                error: z.string()
            })

            export const Completed = Base.extend({
                type: z.literal('completed'),
                result: z.string()
            })

       
            export type Started = z.infer<typeof Started>
            export type Update = z.infer<typeof Update>
            export type Terminated = z.infer<typeof Terminated>
            export type Paused = z.infer<typeof Paused>
            export type Failed = z.infer<typeof Failed>
            export type Completed = z.infer<typeof Completed>


            export const Schema = z.discriminatedUnion("type", [
                Job.Started,
                Job.Update,
                Job.Terminated,
                Job.Paused,
                Job.Failed,
                Job.Completed,
            ])
        }
        export type Job = z.infer<typeof Job.Schema>

        export const Schema = z.discriminatedUnion("type", [
            Job.Started,
            Job.Update,
            Job.Terminated,
            Job.Paused,
            Job.Failed,
            Job.Completed,
            Compilation.Started,
            Compilation.Completed,
            Compilation.Failed
        ])
    }
    export type Event = z.infer<typeof Event.Schema>

    // Signals are sent from the backend and subscribed on the worker
    export namespace Signal {
        export const Channel = Realtime.Channel.brand("OrchestratorSignalChannel")
        export type Channel = z.infer<typeof Channel>

        export const getChannel = (jobId: Job.Id) => `job:${jobId}:signal` as Channel

        export const Base = Realtime.Signal.Base.extend({
            jobId: Job.Id
        })

        export namespace Terminate {
            export const Schema = Base.extend({
                type: z.literal("terminate")
            })
        }
        export type Terminate = z.infer<typeof Terminate.Schema>

        export namespace Pause {
            export const Schema = Base.extend({
                type: z.literal("pause")
            })
        }
        export type Pause= z.infer<typeof Pause.Schema>

        export namespace Resume {
            export const Schema = Base.extend({
                type: z.literal("resume")
            })
        }
        export type Resume= z.infer<typeof Resume.Schema>

        export const Schema = z.discriminatedUnion("type", [
            Terminate.Schema,
            Pause.Schema,
            Resume.Schema
        ])
    }
    export type Signal = z.infer<typeof Signal.Schema>

    export namespace API {
        export namespace Run {
            export const Request = z.object({
                workflow: Workflow.Schema,
                executionSession: ExecutionSession.Schema,
            })
            export const Response = z.object({
                jobId: Job.Id
            })

            export type Request = z.infer<typeof Request>
            export type Response = z.infer<typeof Response>
        }
        export async function run(
            api: AxiosInstance,
            req: Run.Request
        ): Promise<Run.Response> {
            const { data } = await api.post<Run.Response>(
                '/api/orchestrator/run',
                req
            );
            return data;
        }

        export namespace Pause {
            export const Request = z.object({
                jobId: Job.Id
            })
            export const Response = z.object({})

            export type Request = z.infer<typeof Request>
            export type Response = z.infer<typeof Response>
        }

        export async function pause(
            api: AxiosInstance,
            req: Pause.Request
        ): Promise<Pause.Response> {
            const { data } = await api.post<Pause.Response>(
                '/api/orchestrator/pause',
                req
            );
            return data;
        }

        export namespace Resume {
            export const Request = z.object({
                jobId: Job.Id
            })
            export const Response = z.object({})

            export type Request = z.infer<typeof Request>
            export type Response = z.infer<typeof Response>
        }
        export async function resume(
            api: AxiosInstance,
            req: Resume.Request
        ): Promise<Resume.Response> {
            const { data } = await api.post<Resume.Response>(
                '/api/orchestrator/resume',
                req
            );
            return data;
        }

        export namespace Terminate {
            export const Request = z.object({
                jobId: Job.Id
            })
            export const Response = z.object({})

            export type Request = z.infer<typeof Request>
            export type Response = z.infer<typeof Response>
        }
        export async function terminate(
            api: AxiosInstance,
            req: Terminate.Request
        ): Promise<Terminate.Response> {
            const { data } = await api.post<Terminate.Response>(
                '/api/orchestrator/terminate',
                req
            );
            return data;
        }

        export namespace Finalise {
            export const Request = z.object({
                jobId: Job.Id,
                status: Job.Status,
            })
            export const Response = z.object({})

            export type Request = z.infer<typeof Request>
            export type Response = z.infer<typeof Response>
        }
        export async function finalise(
            api: AxiosInstance,
            req: Finalise.Request
        ): Promise<Finalise.Response> {
            const { data } = await api.post<Finalise.Response>(
                '/api/orchestrator/finalise',
                req
            );
            return data;
        }

        export namespace TerminateAll {
            export const Request = z.object({})
            export const Response = z.object({
                terminatedCount: z.number()
            })

            export type Request = z.infer<typeof Request>
            export type Response = z.infer<typeof Response>
        }
        export async function terminateAll(
            api: AxiosInstance,
        ): Promise<TerminateAll.Response> {
            const { data } = await api.post<TerminateAll.Response>(
                '/api/orchestrator/terminate-all',
            );
            return data;
        }

        export namespace ListActive {
            export const Request = z.object({})
            export const Response = z.object({
                jobs: z.array(z.object({
                    id: Job.Id,
                    workflow_id: Workflow.Id,
                    status: Job.Status,
                    created_at: z.string(),
                    updated_at: z.string(),
                }))
            })

            export type Request = z.infer<typeof Request>
            export type Response = z.infer<typeof Response>
        }
        export async function listActive(
            api: AxiosInstance,
        ): Promise<ListActive.Response> {
            const { data } = await api.post<ListActive.Response>(
                '/api/orchestrator/list-active',
            );
            return data;
        }

        export namespace Schedule {
            export namespace Create {
                export const Request = z.object({
                    workflowId: Workflow.Id,
                    schedule: Schedule
                })
                export const Response = z.object({
                    scheduleId: z.string()
                })

                export type Request = z.infer<typeof Request>
                export type Response = z.infer<typeof Response>
            }

            export namespace Delete {
                export const Request = z.object({
                    scheduleId: z.string()
                })
                export const Response = z.object({})

                export type Request = z.infer<typeof Request>
                export type Response = z.infer<typeof Response>
            }
        }
    }
}