import z from "zod"
import { Workflow } from "./Workflow"
import { Auth } from "./Auth"
import { Realtime } from "./Realtime"

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
    export type Job = z.infer<typeof Job.Schema>


    export namespace ExecutionQueue {
        export namespace Item {
            export const Schema = z.object({
                jobId: Job.Id,
                workflow: Workflow.Schema,
                userId: Auth.User.Id
            })
        }
        export type Item = z.infer<typeof ExecutionQueue.Item.Schema>
    }

    export namespace Event {
        export const Type = z.enum([
            "job:started",
            "job:progress",
            "job:node:started",
            "job:node:completed",
            "job:node:error",
            "job:completed",
            "job:failed",
            "job:paused",
            "job:terminated"
        ])
        export type Type = z.infer<typeof Type>

        const Base = Realtime.Event.Base.extend({
            payload: z.object({
                jobId: Orchestrator.Job.Id,
                workflowId: Workflow.Id,
            })
        })
        export namespace Job {
            export namespace Started {
                export const Schema = Base.extend({
                    type: z.literal('job:started'),
                })
            }

            export namespace Progress {
                export const Schema = Base.extend({
                    type: z.literal('job:progress'),
                    progress: z.number().min(0).max(100),
                })
            }

            export namespace Terminated {
                export const Schema = Base.extend({
                    type: z.literal('job:terminated'),
                })
            }

            export namespace Paused {
                export const Schema = Base.extend({
                    type: z.literal('job:paused'),
                })
            }

            export namespace Failed {
                export const Schema = Base.extend({
                    type: z.literal('job:failed'),
                    error: z.string()
                })
            }

            export namespace Completed {
                export const Schema = Base.extend({
                    type: z.literal('job:completed'),
                    result: z.unknown()
                })
            }

            export type Started = z.infer<typeof Started.Schema>
            export type Progress = z.infer<typeof Progress.Schema>
            export type Terminated = z.infer<typeof Terminated.Schema>
            export type Paused = z.infer<typeof Paused.Schema>
            export type Failed = z.infer<typeof Failed.Schema>
            export type Completed = z.infer<typeof Completed.Schema>

            export const Schema = z.discriminatedUnion("type", [
                Job.Started.Schema,
                Job.Progress.Schema,
                Job.Terminated.Schema,
                Job.Paused.Schema,
                Job.Failed.Schema,
                Job.Completed.Schema,
            ])

            export namespace Node {
                export namespace Started {
                    export const Schema = Base.extend({
                        type: z.literal('job:node:started'),
                        nodeId: Workflow.Node.Id
                    })
                }

                export namespace Completed {
                    export const Schema = Base.extend({
                        type: z.literal('job:node:completed'),
                        nodeId: Workflow.Node.Id,
                        output: z.unknown()
                    })
                }

                export namespace Error {
                    export const Schema = Base.extend({
                        type: z.literal('job:node:error'),
                        nodeId: Workflow.Node.Id
                    })
                }

                export type Started = z.infer<typeof Started.Schema>
                export type Completed = z.infer<typeof Completed.Schema>
                export type Error = z.infer<typeof Error.Schema>
                export const Schema = z.discriminatedUnion("type",[
                    Job.Node.Started.Schema,
                    Job.Node.Completed.Schema,
                    Job.Node.Error.Schema,
                ])
            }
            export type Node = z.infer<typeof Node.Schema>
        }
        export type Job = z.infer<typeof Job.Schema>

        export const Schema = z.discriminatedUnion("type", [
            Job.Started.Schema,
            Job.Progress.Schema,
            Job.Terminated.Schema,
            Job.Paused.Schema,
            Job.Failed.Schema,
            Job.Completed.Schema,
            Job.Node.Started.Schema,
            Job.Node.Completed.Schema,
            Job.Node.Error.Schema
        ])
    }
    export type Event = z.infer<typeof Event.Schema>

    export namespace API {
        export namespace Execution {
            export namespace Run {
                export const Request = Workflow.Schema
                export const Response = z.object({
                    jobId: Job.Id
                })

                export type Request = z.infer<typeof Request>
                export type Response = z.infer<typeof Response>
            }

            export namespace Pause {
                export const Request = z.object({
                    jobId: Job.Id
                })
                export const Response = z.object({})

                export type Request = z.infer<typeof Request>
                export type Response = z.infer<typeof Response>
            }

            export namespace Resume {
                export const Request = z.object({
                    jobId: Job.Id
                })
                export const Response = z.object({})

                export type Request = z.infer<typeof Request>
                export type Response = z.infer<typeof Response>
            }

            export namespace Terminate {
                export const Request = z.object({
                    jobId: Job.Id
                })
                export const Response = z.object({})

                export type Request = z.infer<typeof Request>
                export type Response = z.infer<typeof Response>
            }
        }

        export namespace Schedule {
            export namespace Create {
                export const Request = z.object({
                    workflowId: z.string(),
                    schedule: z.string()
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