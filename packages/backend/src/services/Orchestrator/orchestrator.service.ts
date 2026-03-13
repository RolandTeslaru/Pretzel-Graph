import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { createAuthenticatedClient } from '@/utils/supabase';
import { REDIS_HOST, REDIS_PORT } from '@vx-agent-editor/shared/constants';
import { Auth, Validation, Workflow } from '@vx-agent-editor/shared/domain';
import { Orchestrator } from '@vx-agent-editor/shared/domain';
import { SecretsResolver } from './utils';

@Injectable()
export class OrchestratorService {
    private readonly redisPub = new Redis({ host: REDIS_HOST, port: REDIS_PORT });

    constructor(
        @InjectQueue('workflow-execution')
        private readonly executionQueue: Queue,
    ) { }

    private readonly dbOps = {
        job: {
            create: async (supabase: any, { workflowId, userId }: { workflowId: string, userId: string }) => {
                const jobId = crypto.randomUUID() as Orchestrator.Job.Id;
                await supabase.from('jobs').insert({
                    id: jobId,
                    workflow_id: workflowId,
                    status: "pending",
                    created_at: new Date(),
                    updated_at: new Date(),
                    duration: 0,
                    user_id: userId
                });
                return jobId;
            },
            update: async (supabase: any, { jobId, status, error }: { jobId: string, status: string, error?: string }) => {
                await supabase.from('jobs').update({
                    status,
                    error,
                    updated_at: new Date()
                }).eq('id', jobId);
            },
            delete: async (supabase: any, jobId: string) => {
                await supabase.from('jobs').delete().eq('id', jobId);
            }
        }
    };


    async run(
        token: string,
        userId: Auth.User.Id,
        payload: Orchestrator.API.Run.Request
    ): Promise<Orchestrator.API.Run.Response> {
        const { workflow, executionSession } = payload

        const wfCache = Workflow.createCache(workflow);

        const workflowIssues = Validation.Issue.checkWorkflow(workflow, wfCache);

        if (Object.entries(workflowIssues).length > 0)
            throw new Error("Workflow has issues");

        const supabase = createAuthenticatedClient(token);

        const jobId = await this.dbOps.job.create(supabase, { workflowId: workflow.id, userId });

        try {
            await SecretsResolver.resolveWorkflow(supabase, workflow);

            const queueItem: Orchestrator.ExecutionQueue.Item = {
                jobId,
                workflow,
                userId,
                executionSession
            };

            await this.executionQueue.add('run', queueItem);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            await this.dbOps.job.update(supabase, { jobId, status: "failed", error: errorMessage });
            throw error;
        }

        return { jobId };
    }


    async pause(
        token: string,
        payload: Orchestrator.API.Pause.Request
    ): Promise<void> {
        const supabase = createAuthenticatedClient(token);
        const { jobId } = payload;
        await this.dbOps.job.update(supabase, { jobId, status: "paused" });
    }


    async resume(
        token: string,
        payload: Orchestrator.API.Resume.Request
    ): Promise<void> {
        const supabase = createAuthenticatedClient(token);
        const { jobId } = payload;
        await this.dbOps.job.update(supabase, { jobId, status: "running" });
    }


    async terminate(
        token: string,
        payload: Orchestrator.API.Terminate.Request
    ): Promise<void> {
        const supabase = createAuthenticatedClient(token);
        const { jobId } = payload;

        await this.redisPub.publish("aggex:terminate", jobId);
        await this.dbOps.job.update(supabase, { jobId, status: "terminated" });
    }


    async finalise(
        token: string,
        payload: Orchestrator.API.Finalise.Request
    ): Promise<void> {
        const supabase = createAuthenticatedClient(token);
        const { jobId, status } = payload;
        await this.dbOps.job.update(supabase, { jobId, status });
    }
}
