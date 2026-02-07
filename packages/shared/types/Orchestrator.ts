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

    export const GraphState = z.object({
        node_outputs: z.record(Workflow.Node.Id, z.any()),
        messages: z.array(z.any()),
        artifacts: z.record(z.string(), z.any()),
        metadata: z.record(z.string(), z.any()),
    })
    export type GraphState = z.infer<typeof GraphState>


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
        // Create a base from the realtime event base
        const Base = Realtime.Event.Base.extend({
            jobId: Orchestrator.Job.Id,
            workflowId: Workflow.Id,
        })
        export namespace Job {
            export const Started = Base.extend({
                type: z.literal('job:started'),
            })

            export const Update = Base.extend({
                type: z.literal('job:update'),
                update: z.object({
                    node_outputs: z.record(z.string(), z.any()).optional(),
                    messages: z.any().optional(),
                    artifacts: z.record(z.string(), z.any()).optional(),
                    metadata: z.record(z.string(), z.any()).optional(),
                })
            })


            export const Terminated = Base.extend({
                type: z.literal('job:terminated'),
            })


            export const Paused = Base.extend({
                type: z.literal('job:paused'),
            })


            export const Failed = Base.extend({
                type: z.literal('job:failed'),
                error: z.string()
            })

            export const Completed = Base.extend({
                type: z.literal('job:completed'),
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

            export namespace Node {
                export const Started = Base.extend({
                    type: z.literal('job:node:started'),
                    nodeId: Workflow.Node.Id
                })

                export const Completed = Base.extend({
                    type: z.literal('job:node:completed'),
                    nodeId: Workflow.Node.Id,
                    output: z.unknown()
                })

                export const Error = Base.extend({
                    type: z.literal('job:node:error'),
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
            Job.Node.Started,
            Job.Node.Completed,
            Job.Node.Error
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