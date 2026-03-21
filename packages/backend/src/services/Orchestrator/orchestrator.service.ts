import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import { createAuthenticatedClient, createServiceClient } from '@/utils/supabase';
import { REDIS_HOST, REDIS_PORT } from '@vx-agent-editor/shared/constants';
import { Auth, Realtime, Validation, Workflow } from '@vx-agent-editor/shared/domain';
import { Orchestrator } from '@vx-agent-editor/shared/domain';
import { SecretsResolver } from './utils';
import { SupabaseClient } from '@supabase/supabase-js';
import { RealtimeService } from '../Realtime/realtime.service';
import { ChatService } from '../Chat/chat.service';

@Injectable()
export class OrchestratorService {

    private readonly queueEvents = new QueueEvents(Orchestrator.EXECUTION_QUEUE_ID, {
        connection: { 
            host: REDIS_HOST, 
            port: REDIS_PORT, 
            maxRetriesPerRequest: null 
        }  
    });

    private readonly serviceSupabase = createServiceClient()


    constructor(
        @InjectQueue(Orchestrator.EXECUTION_QUEUE_ID)
        private readonly executionQueue: Queue,
        private readonly realtime: RealtimeService,
        private readonly chat: ChatService,
    ) {
        
        this.queueEvents.on("completed", async ({ jobId, returnvalue }) => {
            const result = typeof returnvalue === 'string' ? JSON.parse(returnvalue) : returnvalue;
            
            const status = result?.status === 'terminated' ? 'terminated' : 'completed';

            await this.dbOps.job.update(this.serviceSupabase, { jobId: jobId as Orchestrator.Job.Id, status });
        });

        this.queueEvents.on("failed", async ({ jobId, failedReason }) => {
            console.error(`[Orchestrator] Job ${jobId} failed:`, failedReason);

            const newStatus = failedReason === "terminated" ? "terminated" : "failed";

            await this.dbOps.job.update(
                this.serviceSupabase, 
                { 
                    jobId: jobId as Orchestrator.Job.Id, 
                    status: newStatus, 
                    error: failedReason 
                }
            );
        });
    }

    private readonly dbOps = {
        job: {
            create: async (supabase: SupabaseClient, { workflowId, userId }: { workflowId: Workflow.Id, userId: Auth.User.Id }) => {
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
            update: async (supabase: SupabaseClient, { jobId, status, error }: { jobId: Orchestrator.Job.Id, status: string, error?: string }) => {

                console.log(`Updating jobs table for ${jobId} with status ${status}`)

                const { error: supabaseError } = await supabase.from('jobs').update({
                    status,
                    error,
                    updated_at: new Date()
                }).eq('id', jobId);

                if(supabaseError)
                    console.log("SUPABASE ERRROR ", supabaseError)
            },
            delete: async (supabase: SupabaseClient, jobId: Orchestrator.Job.Id) => {
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

            const needsChat = Object.values(workflow.data.nodes).some(n =>
                n.blueprintId === "Core.Chat.Output"
            );

            if (needsChat) {
                await this.chat.ensure(token, userId, {
                    chatId: executionSession.chatId,
                    workflow_id: workflow.id,
                });
            }


            const queueItem: Orchestrator.ExecutionQueue.Item = {
                jobId,
                workflow,
                userId,
                executionSession
            };

            await this.executionQueue.add('run', queueItem, { jobId });

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
    ): Promise<Orchestrator.API.Pause.Response> {
        const supabase = createAuthenticatedClient(token);
        const { jobId } = payload;
        
        const confirmation = this.realtime.withEventConfirmation(
            Orchestrator.Event.getChannel(jobId),
            "paused"
        )

        this.realtime.emitSignal<Orchestrator.Signal.Pause>({
            channel: Orchestrator.Signal.getChannel(jobId),
            type: "pause",
            jobId
        })

        const success = await confirmation;

        if(success)
            await this.dbOps.job.update(supabase, { jobId, status: "paused" });
    
        return { success }
    }


    async resume(
        token: string,
        { jobId }: Orchestrator.API.Resume.Request
    ): Promise<Orchestrator.API.Resume.Response> {
        const supabase = createAuthenticatedClient(token);

        const confirmation = this.realtime.withEventConfirmation(
            Orchestrator.Event.getChannel(jobId),
            "resumed"
        );

        this.realtime.emitSignal<Orchestrator.Signal.Resume>({
            channel: Orchestrator.Signal.getChannel(jobId),
            type: "resume",
            jobId
        })

        const success = await confirmation;

        if(success)
            await this.dbOps.job.update(supabase, { jobId, status: "running" });

        return { success };
    }


    async terminate(
        token: string,
        payload: Orchestrator.API.Terminate.Request
    ): Promise<Orchestrator.API.Terminate.Response> {
        const supabase = createAuthenticatedClient(token);
        const { jobId } = payload;

        // Subscribe before emitting to avoid missing the response
        const confirmation = this.realtime.withEventConfirmation(
            Orchestrator.Event.getChannel(jobId),
            "terminated"
        );

        this.realtime.emitSignal<Orchestrator.Signal.Terminate>({
            channel: Orchestrator.Signal.getChannel(jobId),
            type: "terminate",
            jobId
        });

        const success = await confirmation;

        if (success)
            await this.dbOps.job.update(supabase, { jobId, status: "terminated" });

        return { success };
    }


    private async assertAdmin(supabase: SupabaseClient, userId: Auth.User.Id): Promise<void> {
        const { data, error } = await supabase
            .from('users')
            .select('is_admin')
            .eq('id', userId)
            .single();

        if (error || !data?.is_admin) {
            throw new Error('Forbidden: admin access required');
        }
    }


    async listActive(
        token: string,
        userId: Auth.User.Id,
    ): Promise<Orchestrator.API.ListActive.Response> {
        const supabase = createAuthenticatedClient(token);
        await this.assertAdmin(supabase, userId);

        const { data, error } = await supabase
            .from('jobs')
            .select('id, workflow_id, status, created_at, updated_at')
            .in('status', ['pending', 'running']);

        if (error) throw new Error(error.message);

        return { jobs: data ?? [] };
    }


    async terminateAll(
        token: string,
        userId: Auth.User.Id,
    ): Promise<Orchestrator.API.TerminateAll.Response> {
        const supabase = createAuthenticatedClient(token);
        await this.assertAdmin(supabase, userId);

        // 1. Get all active jobs from DB
        const { data: activeJobs, error } = await this.serviceSupabase
            .from('jobs')
            .select('id')
            .in('status', ['pending', 'running']);

        if (error) throw new Error(error.message);
        if (!activeJobs || activeJobs.length === 0) return { terminatedCount: 0 };

        // 2. Signal running engines to stop via Redis (engine.kill() is graceful)
        for (const job of activeJobs) {
            this.realtime.emitSignal<Orchestrator.Signal.Terminate>({
                channel: Orchestrator.Signal.getChannel(job.id),
                type: "terminate",
                jobId: job.id
            })
        }

        // 3. Remove waiting/delayed jobs from the queue (not yet picked up by a worker)
        const waiting = await this.executionQueue.getJobs(['waiting', 'delayed']);
        for (const bullJob of waiting) {
            await bullJob.remove();
        }

        // 4. Mark all active jobs as terminated in DB
        const { error: updateError } = await this.serviceSupabase
            .from('jobs')
            .update({ status: 'terminated', error: 'Terminated by admin', updated_at: new Date() })
            .in('id', activeJobs.map(j => j.id));

        if (updateError) throw new Error(updateError.message);

        return { terminatedCount: activeJobs.length };
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
