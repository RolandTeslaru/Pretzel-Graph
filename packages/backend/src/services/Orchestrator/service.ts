import { Service } from "../ServiceManager";
import { Router } from "express";
import { withAuth } from "@/utils/withAuth";
import { createAuthenticatedClient, getUserId } from "@/utils/supabase";
import { Auth, Orchestrator, Vault, Workflow } from "@vx-agent-editor/shared/domain";
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { SupabaseClient } from "@supabase/supabase-js";
import { resolveCredential } from "@/utils/resolveCredential";
import { SecretsHandler } from "./utils";

@Service("Orchestrator")
export class OrchestratorServiceImpl {

    private redis = new IORedis({ host: 'localhost', port: 6379 })
    private executionQueue = new Queue('workflow-execution', {
        connection: this.redis
    });

    constructor() { }

    private readonly dbOps: OrchestratorService.DbOps = {
        job: {
            create: async (supabase, { workflowId, userId }) => {
                const jobId = crypto.randomUUID() as Orchestrator.Job.Id
                await supabase.from('jobs').insert({
                    id: jobId,
                    workflow_id: workflowId,
                    status: "pending",
                    created_at: new Date(),
                    updated_at: new Date(),
                    duration: 0,
                    user_id: userId
                });
                return jobId
            },
            update: async (supabase, { jobId, status, error }) => {
                await supabase.from('jobs').update({
                    status,
                    error,
                    updated_at: new Date()
                }).eq('id', jobId);
            },
            delete: async (supabase, jobId) => {
                await supabase.from('jobs').delete().eq('id', jobId);
            }
        }
    }

    public readonly ops: OrchestratorService.Ops = {
        execution: {
            run: async (token, workflow) => {
                const supabase = createAuthenticatedClient(token);
                const userId = await getUserId(supabase) as Auth.User.Id

                if (!userId) {
                    throw new Error("User not found")
                }

                const jobId = await this.dbOps.job.create(supabase, { workflowId: workflow.id, userId })

                try {
                    await SecretsHandler.resolveWorkflow(supabase, workflow)


                    const queueItem: Orchestrator.ExecutionQueue.Item = {
                        jobId,
                        workflow,
                        userId
                    }

                    await this.executionQueue.add('run', queueItem);

                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    await this.dbOps.job.update(supabase, { jobId, status: "failed", error: errorMessage })
                    throw error;
                }

                return { jobId }
            },
            pause: async (token, payload) => {
                const supabase = createAuthenticatedClient(token);
                const { jobId } = payload

                await this.dbOps.job.update(supabase, { jobId, status: "paused" })
            },
            resume: async (token, payload) => {
                const supabase = createAuthenticatedClient(token);
                const { jobId } = payload

                await this.dbOps.job.update(supabase, { jobId, status: "running" })
            },
            terminate: async (token, payload) => {
                const supabase = createAuthenticatedClient(token);
                const { jobId } = payload

                await this.dbOps.job.delete(supabase, jobId)
            }
        }
    }

    public readonly controller: OrchestratorService.Controller = {
        execution: {
            run: withAuth(async (token, req) => {
                const payload = Orchestrator.API.Execution.Run.Request.parse(req.body);
                return await this.ops.execution.run(token, payload);
            }),
            pause: withAuth(async (token, req) => {
                const payload = Orchestrator.API.Execution.Pause.Request.parse(req.body);
                return await this.ops.execution.pause(token, payload);
            }),
            terminate: withAuth(async (token, req) => {
                const payload = Orchestrator.API.Execution.Terminate.Request.parse(req.body);
                return await this.ops.execution.terminate(token, payload);
            })
        }
    }

    public readonly routes = Router()
        .post("/execution/run", this.controller.execution.run)
        .post("/execution/pause", this.controller.execution.pause)
        .post("/execution/terminate", this.controller.execution.terminate)
}

export const OrchestratorService = Service.get<OrchestratorServiceImpl>("Orchestrator");




export namespace OrchestratorService {

    export type DbOps = {
        job: {
            create: (supabase: SupabaseClient, { workflowId, userId }: { workflowId: Workflow.Id, userId: Auth.User.Id }) => Promise<Orchestrator.Job.Id>
            update: (supabase: SupabaseClient, { jobId, status, error }: { jobId: Orchestrator.Job.Id, status: Orchestrator.Job.Status, error?: string }) => Promise<void>
            delete: (supabase: SupabaseClient, jobId: Orchestrator.Job.Id) => Promise<void>
        }
    }

    export type Ops = {
        execution: {
            run: (token: string, payload: Orchestrator.API.Execution.Run.Request) => Promise<Orchestrator.API.Execution.Run.Response>
            pause: (token: string, payload: Orchestrator.API.Execution.Pause.Request) => Promise<void>
            resume: (token: string, payload: Orchestrator.API.Execution.Resume.Request) => Promise<void>
            terminate: (token: string, payload: Orchestrator.API.Execution.Terminate.Request) => Promise<void>
        }
    }

    export type Controller = {
        execution: {
            run: (req: any, res: any) => void
            pause: (req: any, res: any) => void
            terminate: (req: any, res: any) => void
        }
    }
}