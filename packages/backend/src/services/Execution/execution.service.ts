import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, QueueEvents } from 'bullmq';
import { SupabaseClient } from '@supabase/supabase-js';
import { createAuthenticatedClient, createServiceClient } from '@/utils/supabase';
import { Principal } from '@/domain/Principal';
import { REDIS_HOST, REDIS_PORT } from '@pretzel-graph/shared/constants';
import { Auth, Execution, Validation, Workflow } from '@pretzel-graph/shared/domain';
import { SystemError } from '@pretzel-graph/shared/domain/SystemError';
import { Algorithms } from '@pretzel-graph/shared/domain/Algorithms';
import { withSupabaseAssert } from '@pretzel-graph/shared/errors/supabase';
import { RealtimeService } from '../Realtime/realtime.service';
import { SecretsResolver } from './utils';
import { assertWorkflowOwnership, assertExecutionOwnership, loadWorkflowOwner } from '../../auth/ownership';

@Injectable()
export class ExecutionService {

    private readonly queueEvents = new QueueEvents(Execution.Queue.ID, {
        connection: { host: REDIS_HOST, port: REDIS_PORT, maxRetriesPerRequest: null }
    });

    private readonly serviceSupabase = createServiceClient();




    constructor(
        @InjectQueue(Execution.Queue.ID)
        private readonly executionQueue: Queue,
        private readonly realtime: RealtimeService,
    ) {
        this.queueEvents.on('completed', async ({ jobId, returnvalue }) => {
            const result = typeof returnvalue === 'string' ? JSON.parse(returnvalue) : returnvalue;
            const status = result?.status === 'terminated' ? 'terminated' : 'completed';
            await this.dbOps.update(this.serviceSupabase, { executionId: jobId as Execution.Id, status });
        });

        this.queueEvents.on('failed', async ({ jobId, failedReason }) => {
            console.error(`[Execution] ${jobId} failed:`, failedReason);
            const status = failedReason === 'terminated' ? 'terminated' : 'failed';
            await this.dbOps.update(this.serviceSupabase, { executionId: jobId as Execution.Id, status, error: failedReason });
        });
    }




    private readonly dbOps = {
        create: withSupabaseAssert('execution.create', async (
            supabase: SupabaseClient,
            props: {
                workflowId: Workflow.Id,
                userId: Auth.User.Id,
                igniter: Execution.Igniter,
                session: Execution.Session,
            }
        ) => {
            const executionId = crypto.randomUUID() as Execution.Id;
            await supabase.from('executions').insert({
                id:          executionId,
                workflow_id: props.workflowId,
                user_id:     props.userId,
                igniter:     props.igniter,
                status:      'pending',
                duration:    0,
                session:     props.session,
                created_at:  new Date(),
                updated_at:  new Date(),
            }).throwOnError();
            return executionId;
        }),

        update: withSupabaseAssert('execution.update', async (
            supabase: SupabaseClient,
            props: { executionId: Execution.Id, status: Execution.Status, error?: string }
        ) => {
            await supabase.from('executions').update({
                status: props.status,
                ...(props.error !== undefined && { error: props.error }),
                updated_at: new Date(),
            }).eq('id', props.executionId).throwOnError();
        }),

        updateSession: withSupabaseAssert('execution.updateSession', async (
            supabase: SupabaseClient,
            props: { executionId: Execution.Id, session: Execution.Session.Update }
        ) => {
            await supabase.from('executions').update({
                session: props.session,
                updated_at: new Date(),
            }).eq('id', props.executionId).throwOnError();
        }),
    };




    async runFromUser(
        token: string,
        userId: Auth.User.Id,
        payload: Execution.API.Run.Request,
    ): Promise<Execution.API.Run.Response> {
        const supabase = createAuthenticatedClient(token);
        const ownerId = await assertWorkflowOwnership(supabase, payload.workflowId, userId);
        return this.runCore(supabase, ownerId, payload, { variant: 'workbench_manual' });
    }





    async runFromService(
        payload: Execution.API.Run.InternalRequest,
        service: string,
    ): Promise<Execution.API.Run.Response> {
        const userId = await loadWorkflowOwner(this.serviceSupabase, payload.workflowId);
        return this.runCore(this.serviceSupabase, userId, payload, payload.igniter ?? { variant: 'workbench_manual' });
    }




    private async runCore(
        supabase: SupabaseClient,
        userId: Auth.User.Id,
        payload: Execution.API.Run.Request,
        igniter: Execution.Igniter,
    ): Promise<Execution.API.Run.Response> {
        const { workflowId, workflowData } = payload;

        const wfCache = Workflow.createCache(workflowData);
        // Validation
        const arcsMap = Workflow.deriveArcs(wfCache);
        const sccs   = Algorithms.Tarjan.deriveSCCs(workflowData.nodes, arcsMap)[3];
        const cycles = Algorithms.Johnson.getAllCycles(arcsMap, sccs);
        const issues = Validation.Issue.checkWorkflow(workflowData, cycles, wfCache);

        if (Validation.workflowHasIssues(issues))
            throw new SystemError(
                SystemError.Code.CONFIG_INVALID_FIELD,
                'Workflow has nodes with missing fields or inputs — fix them before running',
                { data: { issues } }
            );

        const session = Execution.Session.createInitial();
        const executionId = await this.dbOps.create(supabase, { workflowId, userId, igniter, session });

        const execution = {
            id: executionId,
            session,
            igniter,
            workflow_id: workflowId,
            status: "running",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            duration: 0
        } satisfies Execution
        

        try {
            await SecretsResolver.resolveWorkflow(supabase, workflowData);

            const queueItem: Execution.Queue.Item = {
                execution,
                workflowId,
                workflowData,
            };

            await this.executionQueue.add('run', queueItem, { jobId: executionId });

        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            await this.dbOps.update(supabase, { executionId, status: 'failed', error: message });
            throw error;
        }

        const started = await this.realtime.withEventConfirmation(
            Execution.Event.getChannel(executionId),
            'started',
            10_000
        );

        if (!started) {
            await this.dbOps.update(supabase, { executionId, status: 'failed', error: 'No worker picked up the job' });
            this.executionQueue.remove(executionId).catch(err =>
                console.error('Failed to remove execution from queue after start timeout', err)
            );
            throw new SystemError(SystemError.Code.INFRA_UNKNOWN, 'No worker picked up the job');
        }

        const now = new Date().toISOString();
        return {
            execution: {
                id: executionId,
                workflow_id: workflowId,
                igniter,
                status: 'pending' as Execution.Status,
                duration: 0,
                session,
                created_at: now,
                updated_at: now,
            }
        };
    }




    async awaitResult(
        token: string,
        userId: Auth.User.Id,
        { executionId }: Execution.API.AwaitResult.Request,
    ): Promise<Execution.API.AwaitResult.Response> {
        const supabase = createAuthenticatedClient(token);
        await assertExecutionOwnership(supabase, executionId, userId);

        const { data } = await supabase
            .from('executions')
            .select('status')
            .eq('id', executionId)
            .single();

        if (data && ['completed', 'failed', 'terminated'].includes(data.status))
            return { status: data.status as Execution.API.AwaitResult.Response['status'] };

        const event = await this.realtime.withTerminalEvent(Execution.Event.getChannel(executionId));

        if (!event)
            return { status: 'failed', error: { code: SystemError.Code.EXECUTION_TIMEOUT, message: 'Execution timed out' } };

        if (event.type === 'failed')
            return { status: 'failed', error: (event as any).error };

        if (event.type === 'terminated')
            return { status: 'terminated' };

        return { status: 'completed' };
    }




    async pause(
        token: string,
        userId: Auth.User.Id,
        { executionId }: Execution.API.Pause.Request,
    ): Promise<Execution.API.Pause.Response> {
        const supabase = createAuthenticatedClient(token);
        await assertExecutionOwnership(supabase, executionId, userId);

        const confirmation = this.realtime.withEventConfirmation(Execution.Event.getChannel(executionId), 'paused');

        this.realtime.emitSignal<Execution.Signal.Pause>({
            channel: Execution.Signal.getChannel(executionId),
            type: 'pause',
            executionId,
        });

        const success = await confirmation;
        if (success) await this.dbOps.update(supabase, { executionId, status: 'paused' });
        return { success };
    }




    async resume(
        token: string,
        userId: Auth.User.Id,
        { executionId }: Execution.API.Resume.Request,
    ): Promise<Execution.API.Resume.Response> {
        const supabase = createAuthenticatedClient(token);
        await assertExecutionOwnership(supabase, executionId, userId);

        const confirmation = this.realtime.withEventConfirmation(Execution.Event.getChannel(executionId), 'resumed');

        this.realtime.emitSignal<Execution.Signal.Resume>({
            channel: Execution.Signal.getChannel(executionId),
            type: 'resume',
            executionId,
        });

        const success = await confirmation;
        if (success) await this.dbOps.update(supabase, { executionId, status: 'running' });
        return { success };
    }




    async heartbeat(
        token: string,
        userId: Auth.User.Id,
        { executionId }: Execution.API.Heartbeat.Request,
    ): Promise<Execution.API.Heartbeat.Response> {
        const supabase = createAuthenticatedClient(token);
        await assertExecutionOwnership(supabase, executionId, userId);

        this.realtime.emitSignal<Execution.Signal.Heartbeat>({
            channel: Execution.Signal.getChannel(executionId),
            type: 'heartbeat',
            executionId,
        });
        return {};
    }




    async suspend(
        token: string,
        userId: Auth.User.Id,
        { executionId }: Execution.API.Suspend.Request,
    ): Promise<Execution.API.Suspend.Response> {
        const supabase = createAuthenticatedClient(token);
        await assertExecutionOwnership(supabase, executionId, userId);

        const confirmation = this.realtime.withEventConfirmation(Execution.Event.getChannel(executionId), 'suspended');

        this.realtime.emitSignal<Execution.Signal.Suspend>({
            channel: Execution.Signal.getChannel(executionId),
            type: 'suspend',
            executionId,
        });

        const success = await confirmation;
        if (success) await this.dbOps.update(supabase, { executionId, status: 'suspended' });
        return { success };
    }




    async terminate(
        token: string,
        userId: Auth.User.Id,
        { executionId }: Execution.API.Terminate.Request,
    ): Promise<Execution.API.Terminate.Response> {
        const supabase = createAuthenticatedClient(token);
        await assertExecutionOwnership(supabase, executionId, userId);

        const confirmation = this.realtime.withEventConfirmation(Execution.Event.getChannel(executionId), 'terminated');

        this.realtime.emitSignal<Execution.Signal.Terminate>({
            channel: Execution.Signal.getChannel(executionId),
            type: 'terminate',
            executionId,
        });

        const success = await confirmation;
        if (success) await this.dbOps.update(supabase, { executionId, status: 'terminated' });
        return { success };
    }




    async finalise({ executionId, status }: Execution.API.Finalise.Request): Promise<Execution.API.Finalise.Response> {
        await this.dbOps.update(this.serviceSupabase, { executionId, status });
        return {};
    }




    private async assertAdmin(supabase: SupabaseClient, userId: Auth.User.Id): Promise<void> {
        const { data, error } = await supabase
            .from('users')
            .select('is_admin')
            .eq('id', userId)
            .single();

        if (error || !data?.is_admin)
            throw new SystemError(SystemError.Code.INFRA_UNKNOWN, 'Admin access required');
    }




    async listActive(token: string, userId: Auth.User.Id): Promise<Execution.API.ListActive.Response> {
        const supabase = createAuthenticatedClient(token);
        await this.assertAdmin(supabase, userId);

        const { data, error } = await supabase
            .from('executions')
            .select('id, workflow_id, igniter, status, duration, error, created_at, updated_at')
            .in('status', ['pending', 'running']) as { data: Execution.Meta[] | null; error: any };

        if (error) throw new SystemError(SystemError.Code.INFRA_DATABASE_ERROR, error.message);
        return { executions: data ?? [] };
    }




    async terminateAll(token: string, userId: Auth.User.Id): Promise<Execution.API.TerminateAll.Response> {
        const supabase = createAuthenticatedClient(token);
        await this.assertAdmin(supabase, userId);

        const { data: active, error } = await this.serviceSupabase
            .from('executions')
            .select('id')
            .in('status', ['pending', 'running']);

        if (error) throw new SystemError(SystemError.Code.INFRA_DATABASE_ERROR, error.message);
        if (!active || active.length === 0) return { terminatedCount: 0 };

        for (const row of active) {
            this.realtime.emitSignal<Execution.Signal.Terminate>({
                channel: Execution.Signal.getChannel(row.id),
                type: 'terminate',
                executionId: row.id,
            });
        }

        const waiting = await this.executionQueue.getJobs(['waiting', 'delayed']);
        for (const job of waiting) await job.remove();

        await this.serviceSupabase
            .from('executions')
            .update({ status: 'terminated', error: 'Terminated by admin', updated_at: new Date() })
            .in('id', active.map(r => r.id));

        return { terminatedCount: active.length };
    }




    async get(token: string, userId: Auth.User.Id, { executionId }: Execution.API.Get.Request): Promise<Execution.API.Get.Response> {
        const supabase = createAuthenticatedClient(token);
        await assertExecutionOwnership(supabase, executionId, userId);

        const { data, error } = await supabase
            .from('executions')
            .select('id, workflow_id, igniter, status, duration, error, session, created_at, updated_at')
            .eq('id', executionId)
            .single();

        if (error || !data) throw new SystemError(SystemError.Code.NOT_FOUND, 'Execution not found');
        return { execution: data };
    }




    async update({ executionId, session }: Execution.API.Update.Request): Promise<Execution.API.Update.Response> {
        await this.dbOps.updateSession(this.serviceSupabase, { executionId, session });
        return {};
    }




    async metaList(token: string, { workflowId }: Execution.API.Meta.List.Request): Promise<Execution.API.Meta.List.Response> {
        const supabase = createAuthenticatedClient(token);

        const { data, error } = await supabase
            .from('executions')
            .select('id, workflow_id, igniter, status, duration, error, created_at, updated_at')
            .eq('workflow_id', workflowId)
            .order('created_at', { ascending: false }) as { data: Execution.Meta[] | null; error: any };

        if (error) throw new SystemError(SystemError.Code.INFRA_DATABASE_ERROR, error.message);
        return { executions: data ?? [] };
    }




    async metaGet(token: string, userId: Auth.User.Id, { executionId }: Execution.API.Meta.Get.Request): Promise<Execution.API.Meta.Get.Response> {
        const supabase = createAuthenticatedClient(token);
        await assertExecutionOwnership(supabase, executionId, userId);

        const { data, error } = await supabase
            .from('executions')
            .select('id, workflow_id, igniter, status, duration, error, created_at, updated_at')
            .eq('id', executionId)
            .single() as { data: Execution.Meta | null; error: any };

        if (error || !data) throw new SystemError(SystemError.Code.NOT_FOUND, 'Execution not found');
        return { execution: data };
    }
}
