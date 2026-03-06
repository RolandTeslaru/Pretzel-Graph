import { Service } from "../ServiceManager";
import { Router, Request, Response } from "express";
import { WithAuth, withAuth } from "@/handlers/controller";
import { createAuthenticatedClient, getUserId } from "@/utils/supabase";
import { Auth, ExecutionSession, Orchestrator, Validation, Workflow } from "@vx-agent-editor/shared/domain";
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { SecretsResolver } from "./utils";
import { WithSupabase } from "@/handlers/database";
import { REDIS_HOST, REDIS_PORT } from "@vx-agent-editor/shared/constants";

@Service("Orchestrator")
export class OrchestratorServiceImpl {

    private executionQueue = new Queue('workflow-execution', {
        connection: new Redis({ host: REDIS_HOST, port: REDIS_PORT })
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
        run: async (token, { workflow, executionSession }) => {
            const wfCache = Workflow.createCache(workflow);

            const workflowIssues = Validation.Issue.checkWorkflow(workflow, wfCache);

            if (Object.entries(workflowIssues).length > 0)
                throw new Error("Workflow has issues")

            const supabase = createAuthenticatedClient(token);
            const userId = await getUserId(supabase) as Auth.User.Id

            if (!userId)
                throw new Error("User not found")

            const jobId = await this.dbOps.job.create(supabase, { workflowId: workflow.id, userId })

            try {
                await SecretsResolver.resolveWorkflow(supabase, workflow)

                const queueItem: Orchestrator.ExecutionQueue.Item = {
                    jobId,
                    workflow,
                    userId,
                    executionSession
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
        },
        finalise: async (token, { jobId, status }) => {
            const supabase = createAuthenticatedClient(token);



            await this.dbOps.job.update(supabase, { jobId, status: status })
        }
    }

    public readonly controller: OrchestratorService.Controller = {
        run: withAuth(async (token, req) => {
            const payload = Orchestrator.API.Run.Request.parse(req.body);
            return await this.ops.run(token, payload);
        }),
        pause: withAuth(async (token, req) => {
            const payload = Orchestrator.API.Pause.Request.parse(req.body);
            return await this.ops.pause(token, payload);
        }),
        terminate: withAuth(async (token, req) => {
            const payload = Orchestrator.API.Terminate.Request.parse(req.body);
            return await this.ops.terminate(token, payload);
        }),
        finalise: withAuth(async (token, req) => {
            const payload = Orchestrator.API.Finalise.Request.parse(req.body);
            return await this.ops.finalise(token, payload);
        })
    }

    public readonly routes = Router()
        .post("/run", this.controller.run)
        .post("/pause", this.controller.pause)
        .post("/terminate", this.controller.terminate)
        .post("/finalise", this.controller.finalise) // alias for terminate
}

export const OrchestratorService = Service.get<OrchestratorServiceImpl>("Orchestrator");




export namespace OrchestratorService {
    export type DbOps = {
        job: {
            create: WithSupabase<({ workflowId, userId }: { workflowId: Workflow.Id, userId: Auth.User.Id }) => Promise<Orchestrator.Job.Id>>
            update: WithSupabase<({ jobId, status, error }: { jobId: Orchestrator.Job.Id, status: Orchestrator.Job.Status, error?: string }) => Promise<void>>
            delete: WithSupabase<(jobId: Orchestrator.Job.Id) => Promise<void>>
        }
    }

    export type Ops = {
        run: WithAuth<(payload: Orchestrator.API.Run.Request) => Promise<Orchestrator.API.Run.Response>>
        pause: WithAuth<(payload: Orchestrator.API.Pause.Request) => Promise<void>>
        resume: WithAuth<(payload: Orchestrator.API.Resume.Request) => Promise<void>>
        terminate: WithAuth<(payload: Orchestrator.API.Terminate.Request) => Promise<void>>
        finalise: WithAuth<(payload: Orchestrator.API.Finalise.Request) => Promise<void>> // alias for terminate
    }

    export type Controller = {
        run: (req: Request, res: Response) => void
        pause: (req: Request, res: Response) => void
        terminate: (req: Request, res: Response) => void
        finalise: (req: Request, res: Response) => void // alias for terminate
    }
}