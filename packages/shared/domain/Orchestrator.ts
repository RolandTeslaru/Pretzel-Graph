import z from "zod"
import { Workflow } from "./Workflow"
import { Auth } from "./Auth"
import { Realtime } from "./Realtime"
import { type AxiosInstance } from "axios"
import { RuntimeSnapshot } from "./RuntimeSnapshot"

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


    export namespace ExecutionQueue {
        export namespace Item {
            export const Schema = z.object({
                jobId: Job.Id,
                workflow: Workflow.Schema,
                userId: Auth.User.Id,
                snapshot: RuntimeSnapshot.Schema
            })
        }
        export type Item = z.infer<typeof Item.Schema>
    }


    export namespace Event {
        // Create a base from the realtime event base
        const Base = Realtime.Event.Base.extend({
            jobId: Orchestrator.Job.Id,
            workflowId: Workflow.Id,
        })
        export namespace Job {
            export const Started = Base.extend({
                type: z.literal('started'),
            })

            export const Update = Base.extend({
                type: z.literal('update'),
                update: RuntimeSnapshot.Update
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

            export const MessageChunk = Base.extend({
                type: z.literal('node_messages:chunk'),
                nodeId: Workflow.Node.Id,
                chunk: z.string()
            })

            export type Started = z.infer<typeof Started>
            export type Update = z.infer<typeof Update>
            export type Terminated = z.infer<typeof Terminated>
            export type Paused = z.infer<typeof Paused>
            export type Failed = z.infer<typeof Failed>
            export type Completed = z.infer<typeof Completed>
            export type MessageChunk = z.infer<typeof MessageChunk>


            export const Schema = z.discriminatedUnion("type", [
                Job.Started,
                Job.Update,
                Job.Terminated,
                Job.Paused,
                Job.Failed,
                Job.Completed,
                Job.MessageChunk,
            ])

            export namespace Node {
                export const Started = Base.extend({
                    type: z.literal('node:started'),
                    nodeId: Workflow.Node.Id
                })

                export const Completed = Base.extend({
                    type: z.literal('node:completed'),
                    nodeId: Workflow.Node.Id,
                    output: z.unknown()
                })

                export const Error = Base.extend({
                    type: z.literal('node:error'),
                    nodeId: Workflow.Node.Id
                })

                export type Started = z.infer<typeof Started>
                export type Completed = z.infer<typeof Completed>
                export type Error = z.infer<typeof Error>

                export const Schema = z.discriminatedUnion("type", [
                    Started,
                    Completed,
                    Error,
                ])
            }
            export type Node = z.infer<typeof Node.Schema>
        }
        export type Job = z.infer<typeof Job.Schema>

        export const Schema = z.discriminatedUnion("type", [
            Job.Started,
            Job.Update,
            Job.Terminated,
            Job.Paused,
            Job.Failed,
            Job.Completed,
            Job.MessageChunk,
            Job.Node.Started,
            Job.Node.Completed,
            Job.Node.Error
        ])
    }
    export type Event = z.infer<typeof Event.Schema>


    export namespace API {
        export namespace Execution {
            export namespace Run {
                export const Request = z.object({
                    workflow: Workflow.Schema,
                    snapshot: RuntimeSnapshot.Schema,
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
                    '/api/orchestrator/execution/run',
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
                    '/api/orchestrator/execution/pause',
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
                    '/api/orchestrator/execution/resume',
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
                    '/api/orchestrator/execution/terminate',
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
                    '/api/orchestrator/execution/finalise',
                    req
                );
                return data;
            }
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