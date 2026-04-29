import z from "zod"
import { Workflow } from "./Workflow"
import { BaseMessage } from "langchain"
import { Port } from "./Foundations/Port"
import { Projection } from "./Foundations/Projection"
import { Chat } from "./Chat"
import { SystemError } from "./SystemError"
import { Auth, Realtime } from "."

export namespace Execution {
    export namespace Job {
        export const Id = z.string().brand("JobId")
        export type Id = z.infer<typeof Id>

        export const Status = z.enum(["pending", "running", "paused", "suspended", "completed", "failed", "terminated"])
        export type Status = z.infer<typeof Status>

        export namespace Trigger {
            export const User = z.object({
                type: z.literal("user"),
                userId: Auth.User.Id,
            })
            export type User = z.infer<typeof User>

            export const Service = z.object({
                type: z.literal("service"),
                service: z.string(),
                authorizedByUserId: Auth.User.Id.optional(),
            })
            export type Service = z.infer<typeof Service>

            export const Schema = z.discriminatedUnion("type", [User, Service])
        }
        export type Trigger = z.infer<typeof Trigger.Schema>

        export const Schema = z.object({
            id: Job.Id,
            workflowId: Workflow.Id,
            userId: Auth.User.Id.optional(),
            trigger: Trigger.Schema,
            status: Job.Status,
            createdAt: z.date(),
            updatedAt: z.date(),
            duration: z.number(),
        })
    }





    export namespace Session {
        export const Id = z.string().brand("ExecutionSessionId")
        export type Id = z.infer<typeof Id>


        export function createId() {
            return crypto.randomUUID() as Id
        }


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
            id: Id.default(createId()),
            node_output_instances: z.record(Workflow.Node.Id, z.any()).default({}),
            node_output_projections: z.record(Workflow.Node.Id, z.record(Port.Output.Id, Projection.Schema)).default({}),
            node_status: z.record(Workflow.Node.Id, NodeStatus.Schema).default({}),
            edge_state: z.record(Workflow.Edge.Id, EdgeState.Schema).default({}),
            messages: z.array(z.custom<BaseMessage>((v) => v !== null && typeof v === 'object')).default([]),
            metadata: z.record(z.string(), z.any()).default({}),
            chatId: z.lazy(() => Chat.Id).optional(),
            created_at: z.iso.datetime().optional(),
            updated_at: z.iso.datetime().optional(),
        })


        export const createInitial = () => {
            return {
                id: createId(),
                node_output_instances: {},
                node_output_projections: {},
                node_status: {},
                node_messages: {},
                edge_state: {},
                messages: [],
                metadata: {},
            } as z.infer<typeof Schema>
        }

        export const Update = Schema.partial()
        export type Update = z.infer<typeof Update>
    }




    
    export namespace Queue {
        export namespace Item {
            export const Schema = z.object({
                jobId: Job.Id,
                workflowId: Workflow.Id,
                workflowData: Workflow.Data.Schema,
                executionSession: Session.Schema,
                igniter: Igniter.Schema.optional(),
                chatId: Chat.Id.optional()
            })
        }
        export type Item = z.infer<typeof Item.Schema>
    }



    export namespace Igniter {
        export namespace WorkbenchManual {

            export const Schema = z.object({
                variant: z.literal("workbench_manual"),
                payload: z.object({}).optional(),
            })
        }

        export namespace Webhook {
            export const Schema = z.object({
                variant: z.literal("webhook"),
                nodeId: Workflow.Node.Id,
                payload: z.object({
                    method: z.string(),
                    path: z.string(),
                    headers: z.record(z.string(), z.unknown()),
                    query: z.record(z.string(), z.unknown()),
                    body: z.unknown(),
                }),
            })
        }

        export namespace Scheduled {
            export const Schema = z.object({
                variant: z.literal("scheduled"),
                payload: z.object({
                    scheduledAt: z.iso.datetime(),
                    scheduleId: z.string().optional(),
                }),
            })
        }

        export const Schema = z.discriminatedUnion("variant", [
            WorkbenchManual.Schema,
            Webhook.Schema,
            Scheduled.Schema,
        ])
    }
    export type Igniter = z.infer<typeof Igniter.Schema>




    export namespace Event {
        export namespace Session {
            export const Channel = Realtime.Channel.brand("ExecutionSessionChannel")
            export type Channel = z.infer<typeof Channel>

            export function getChannel(executionSessionId: Execution.Session.Id) {
                return `execution_session:${executionSessionId}` as Channel
            }

            // Create a base from the realtime event base
            const Base = Realtime.Event.Base.extend({
                executionSessionId: Execution.Session.Id,
                workflowId: Workflow.Id,
                channel: Event.Session.Channel
            })

            export const Update = Base.extend({
                type: z.literal('update'),
                update: Execution.Session.Update
            })
            export type Update = z.infer<typeof Update>

            export namespace Node {
                export const Started = Base.extend({
                    type: z.literal('node:started'),
                    nodeId: Workflow.Node.Id,
                    stateUpdate: Execution.Session.Update.optional()
                })

                export const Completed = Base.extend({
                    type: z.literal('node:completed'),
                    nodeId: Workflow.Node.Id,
                    output: z.unknown(),
                    stateUpdate: Execution.Session.Update.optional()
                })

                export const Error = Base.extend({
                    type: z.literal('node:error'),
                    nodeId: Workflow.Node.Id,
                    error: SystemError.Schema
                })

                export const Waiting = Base.extend({
                    type: z.literal("node:waiting"),
                    nodeId: Workflow.Node.Id,
                    dependencyResolutionMap: z.record(Workflow.Node.Id, z.boolean()),
                    totalDeps: z.number()
                })

                export type Started = z.infer<typeof Started>
                export type Completed = z.infer<typeof Completed>
                export type Error = z.infer<typeof Error>
                export type Waiting = z.infer<typeof Waiting>

                export const Schema = z.discriminatedUnion("type", [
                    Started,
                    Completed,
                    Error,
                    Waiting
                ])

            }
            export type Node = z.infer<typeof Node.Schema>


            export const Schema = z.discriminatedUnion("type", [
                Update,
                Node.Started,
                Node.Completed,
                Node.Error,
                Node.Waiting
            ])
        }


    }
}