import z from "zod"
import { Workflow } from "./Workflow"
import { Auth } from "./Auth"
import { Realtime } from "./Realtime"
import { AxiosInstance } from "axios"

export namespace Orchestrator {
    export namespace Job {
        export const Id     = z.string().brand("JobId")
        export type Id      = z.infer<typeof Id>

        export const Status = z.enum(["pending", "running", "paused", "completed", "failed", "terminated"])
        export type Status  = z.infer<typeof Status>

        export const Schema = z.object({
            id:         Job.Id,
            workflowId: Workflow.Id,
            userId:     Auth.User.Id,
            status:     Job.Status,
            createdAt:  z.date(),
            updatedAt:  z.date(),
            duration:   z.number(),
        })
    }

    export namespace ExecutionQueue {
        export namespace Item {
            export const Schema = z.object({
                jobId:    Job.Id,
                workflow: Workflow.Schema,
                userId:   Auth.User.Id,
            })
        }
        export type Item = z.infer<typeof Item.Schema>
    }



    export namespace RuntimeState {

        export namespace ToolCall {
            export const Schema = z.object({
                name: z.string(),
                args: z.record(z.string(), z.any()),
                id:   z.string().optional()
            })
        }
        export type ToolCall = z.infer<typeof ToolCall.Schema>

        export namespace Message {
            export const Type = z.enum(["human", "ai", "system", "tool", "function", "developer"])
            export type Type = z.infer<typeof Message.Type>
            export const Schema = z.object({
                type:              Message.Type,
                content:           z.string(),
                name:              z.string().optional(),
                id:                z.string().optional(),
                tool_calls:        z.array(ToolCall.Schema).optional(),
                additional_kwargs: z.record(z.string(), z.any()).optional(),
                response_metadata: z.record(z.string(), z.any()).optional(),
            })
        }
        export type Message = z.infer<typeof Message.Schema>

        export const Schema = z.object({
            node_outputs: z.record(Workflow.Node.Id, z.any()).default(() => ({})),
            messages:     z.array(Message.Schema).default(() => ([])),
            artifacts:    z.record(z.string(), z.any()).default(() => ({})),
            metadata:     z.record(z.string(), z.any()).default(() => ({})),
        })

        export const INITIAL = {
            node_outputs: {},
            messages:     [],
            artifacts:    {},
            metadata:     {}
        } as z.infer<typeof Schema>

        export const Update = Schema.partial()
        export type Update = z.infer<typeof Update>
    }

    export type RuntimeState = z.infer<typeof RuntimeState.Schema>



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
                update: RuntimeState.Update
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