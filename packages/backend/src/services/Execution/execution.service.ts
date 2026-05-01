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
import { PermissionService } from '../Permission/permission.service';
import { Token } from '@/domain/Token';

@Injectable()
export class ExecutionService {

    private readonly queueEvents = new QueueEvents(Execution.Queue.ID, {
        connection: { host: REDIS_HOST, port: REDIS_PORT, maxRetriesPerRequest: null }
    });

    private readonly serviceSupabase = createServiceClient();




    constructor(
        @InjectQueue(Execution.Queue.ID)
        private readonly executionQueue: Queue,
        private readonly realtime:       RealtimeService,
        private readonly ownership:      PermissionService,
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
                userId:     Auth.User.Id,
                igniter:    Execution.Igniter,
                session:    Execution.Session,
            }
        ) => {
            const executionId = crypto.randomUUID() as Execution.Id;
            await supabase
                .from('executions')
                .insert({
                    id:          executionId,
                    workflow_id: props.workflowId,
                    user_id:     props.userId,
                    igniter:     props.igniter,
                    status:      'pending',
                    duration:    0,
                    session:     props.session,
                    created_at:  new Date(),
                    updated_at:  new Date(),
                })
                .throwOnError();
            return executionId;
        }),

        update: withSupabaseAssert('execution.update', async (
            supabase: SupabaseClient,
            props: { 
                executionId: Execution.Id, 
                status?:     Execution.Status, 
                error?:      string, 
                session?:    Execution.Session.Update 
            }
        ) => {
            await supabase
                .from('executions')
                .update({
                    ...(props.status !== undefined && { status: props.status }),
                    ...(props.error !== undefined && { error: props.error }),
                    ...(props.session !== undefined && { session: props.session }),
                    updated_at: new Date(),
                })
                .eq('id', props.executionId)
                .throwOnError();
        }),

        getStatus: withSupabaseAssert('execution.getStatus', async (
            supabase: SupabaseClient,
            executionId: Execution.Id
        ): Promise<Execution.Status> => {
            const { data, error } = await supabase
                .from('executions')
                .select('status')
                .eq('id', executionId)
                .single()
                .throwOnError();

            if (error) 
                throw error;

            return data?.status ?? null;
        }),
        get: withSupabaseAssert('execution.get', async (
            supabase: SupabaseClient,
            executionId: Execution.Id
        ): Promise<Execution> => {
            const { data, error } = await supabase
                .from('executions')
                .select('id, workflow_id, igniter, status, duration, error, session, created_at, updated_at')
                .eq('id', executionId)
                .single()
                .throwOnError();

            if (error || !data)
                throw new SystemError(SystemError.Code.NOT_FOUND, 'Execution not found');

            return data as Execution;
        }),
        meta: {
            get: withSupabaseAssert('execution.meta.get', async (
                supabase: SupabaseClient,
                executionId: Execution.Id
            ): Promise<Execution.Meta> => {
                const { data, error } = await supabase
                    .from('executions')
                    .select('id, workflow_id, igniter, status, duration, error, created_at, updated_at')
                    .eq('id', executionId)
                    .single()
                    .throwOnError();

                if (error || !data) 
                    throw new SystemError(SystemError.Code.NOT_FOUND, 'Execution not found');
                return data as Execution.Meta;
            }),
            list: withSupabaseAssert('execution.meta.list', async (
                supabase: SupabaseClient,
                workflowId: Workflow.Id
            ): Promise<Execution.Meta[]> => {
                const { data, error } = await supabase
                    .from('executions')
                    .select('id, workflow_id, igniter, status, duration, error, created_at, updated_at')
                    .eq('workflow_id', workflowId)
                    .order('created_at', { ascending: false })
                    .throwOnError();

                if (error) throw new SystemError(SystemError.Code.INFRA_DATABASE_ERROR, error);
                return data as Execution.Meta[] ?? [];
            }),
            listActive: withSupabaseAssert('execution.meta.listActive', async (
                supabase: SupabaseClient,
            ): Promise<Execution.Meta[]> => {
                const { data, error } = await supabase
                    .from('executions')
                    .select('id, workflow_id, igniter, status, duration, error, created_at, updated_at')
                    .in('status', ['pending', 'running'])
                    .order('created_at', { ascending: false })
                    .throwOnError();

                if (error) throw new SystemError(SystemError.Code.INFRA_DATABASE_ERROR, error);
                return data as Execution.Meta[] ?? [];
            }),
        }
    };




    public async runFromUser(
        token:   Token.UserSupabaseJWT,
        userId:  Auth.User.Id,
        payload: Execution.API.Run.Request,
    ): Promise<Execution.API.Run.Response> {
        const supabase = createAuthenticatedClient(token);
        const ownerId = await this.ownership.assertWorkflow(supabase, payload.workflowId, userId);
        return this.runCore(supabase, ownerId, payload, { variant: 'workbench_manual' });
    }





    public async runFromService(
        payload: Execution.API.Run.InternalRequest,
        service: string,
    ): Promise<Execution.API.Run.Response> {

        const ownerId = await this.ownership.loadWorkflowOwner(payload.workflowId);
        
        return this.runCore(this.serviceSupabase, ownerId, payload, payload.igniter ?? { variant: 'workbench_manual' });
    }




    private async runCore(
        supabase: SupabaseClient,
        userId:   Auth.User.Id,
        payload:  Execution.API.Run.Request,
        igniter:  Execution.Igniter,
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




    public async awaitResult(
        token:   Token.UserSupabaseJWT,
        userId:  Auth.User.Id,
        payload: Execution.API.AwaitResult.Request,
    ): Promise<Execution.API.AwaitResult.Response> {
        const { executionId } = payload;
        const supabase = createAuthenticatedClient(token);
        await this.ownership.assertExecution(supabase, executionId, userId);

        // Check status first in db
        const status = await this.dbOps.getStatus(supabase, executionId);

        if (['completed', 'failed', 'terminated'].includes(status))
            // @ts-expect-error
            return { status };

        const channel = Execution.Event.getChannel(executionId);

        // Wait for terminal event from worker

        const event = await this.realtime.withTerminalEvent(channel);

        if (!event)
            return { status: 'failed', error: { code: SystemError.Code.EXECUTION_TIMEOUT, message: 'Execution timed out' } };

        if (event.type === 'failed')
            return { status: 'failed', error: (event as any).error };

        if (event.type === 'terminated')
            return { status: 'terminated' };

        return { status: 'completed' };
    }




    public async pause(
        token:   Token.UserSupabaseJWT,
        userId:  Auth.User.Id,
        payload: Execution.API.Pause.Request,
    ): Promise<Execution.API.Pause.Response> {
        const { executionId } = payload;
        const supabase = createAuthenticatedClient(token);

        await this.ownership.assertExecution(supabase, executionId, userId);

        const channel = Execution.Event.getChannel(executionId);

        const confirmation = this.realtime.withEventConfirmation(channel, 'paused');

        this.realtime.emitSignal<Execution.Signal.Pause>({
            channel,
            type: 'pause',
            executionId,
        });

        const success = await confirmation;
        if (success) await this.dbOps.update(supabase, { executionId, status: 'paused' });
        return { success };
    }




    public async resume(
        token:   Token.UserSupabaseJWT,
        userId:  Auth.User.Id,
        payload: Execution.API.Resume.Request,
    ): Promise<Execution.API.Resume.Response> {
        const { executionId } = payload;
        const supabase = createAuthenticatedClient(token);

        await this.ownership.assertExecution(supabase, executionId, userId);

        const channel = Execution.Event.getChannel(executionId);

        const confirmation = this.realtime.withEventConfirmation(channel, 'resumed');

        this.realtime.emitSignal<Execution.Signal.Resume>({
            channel,
            type: 'resume',
            executionId,
        });

        const success = await confirmation;
        if (success) await this.dbOps.update(supabase, { executionId, status: 'running' });
        return { success };
    }




    public async heartbeat(
        token:   Token.UserSupabaseJWT,
        userId:  Auth.User.Id,
        payload: Execution.API.Heartbeat.Request,
    ): Promise<Execution.API.Heartbeat.Response> {
        const { executionId } = payload;
        const supabase = createAuthenticatedClient(token);

        await this.ownership.assertExecution(supabase, executionId, userId);

        const channel = Execution.Signal.getChannel(executionId)

        this.realtime.emitSignal<Execution.Signal.Heartbeat>({
            channel,
            type: 'heartbeat',
            executionId,
        });
        return {};
    }




    public async suspend(
        token:   Token.UserSupabaseJWT,
        userId:  Auth.User.Id,
        payload: Execution.API.Suspend.Request,
    ): Promise<Execution.API.Suspend.Response> {
        const supabase = createAuthenticatedClient(token);
        const { executionId } = payload;

        await this.ownership.assertExecution(supabase, executionId, userId);

        const channel = Execution.Event.getChannel(executionId);

        const confirmation = this.realtime.withEventConfirmation(channel, 'suspended');

        this.realtime.emitSignal<Execution.Signal.Suspend>({
            channel,
            type: 'suspend',
            executionId,
        });

        const success = await confirmation;
        if (success) await this.dbOps.update(supabase, { executionId, status: 'suspended' });
        return { success };
    }




    public async terminate(
        token:   Token.UserSupabaseJWT,
        userId:  Auth.User.Id,
        payload: Execution.API.Terminate.Request,
    ): Promise<Execution.API.Terminate.Response> {
        const { executionId } = payload;

        const supabase = createAuthenticatedClient(token);
        await this.ownership.assertExecution(supabase, executionId, userId);

        const channel = Execution.Event.getChannel(executionId);

        const confirmation = this.realtime.withEventConfirmation(channel, 'terminated');

        this.realtime.emitSignal<Execution.Signal.Terminate>({
            channel,
            type: 'terminate',
            executionId,
        });

        const success = await confirmation;
        if (success) await this.dbOps.update(supabase, { executionId, status: 'terminated' });
        return { success };
    }




    public async finalise({ executionId, status }: Execution.API.Finalise.Request): Promise<Execution.API.Finalise.Response> {
        await this.dbOps.update(this.serviceSupabase, { executionId, status });
        return {};
    }





    public async terminateAll(
        token:  Token.UserSupabaseJWT,
        userId: Auth.User.Id
    ): Promise<Execution.API.TerminateAll.Response> {
        await this.ownership.assertUserAdmin(userId);

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
        for (const job of waiting) 
            await job.remove();

        await this.serviceSupabase
            .from('executions')
            .update({ status: 'terminated', error: 'Terminated by admin', updated_at: new Date() })
            .in('id', active.map(r => r.id));

        return { terminatedCount: active.length };
    }




    public async get(
        token:   Token.UserSupabaseJWT,
        userId:  Auth.User.Id, 
        payload: Execution.API.Get.Request
    ): Promise<Execution.API.Get.Response> {
        const { executionId } = payload;
        const supabase = createAuthenticatedClient(token);

        await this.ownership.assertExecution(supabase, executionId, userId);

        const execution = await this.dbOps.get(supabase, executionId);

        return { execution };
    }




    public async update(
        payload: Execution.API.Update.Request
    ): Promise<Execution.API.Update.Response> {
        const { executionId, session } = payload;
        await this.dbOps.update(this.serviceSupabase, { executionId, session });
        return {};
    }


    public meta = {

        get: async (
            token:   Token.UserSupabaseJWT,
            userId:  Auth.User.Id,
            payload: Execution.API.Meta.Get.Request
        ): Promise<Execution.API.Meta.Get.Response> => {
            const supabase = createAuthenticatedClient(token);
            const { executionId } = payload;

            await this.ownership.assertExecution(supabase, executionId, userId);

            const meta = await this.dbOps.meta.get(supabase, executionId);

            return { execution: meta };
        },


        list: async (
            token:   Token.UserSupabaseJWT, 
            payload: Execution.API.Meta.List.Request
        ): Promise<Execution.API.Meta.List.Response> => {
            const { workflowId } = payload;
            const supabase = createAuthenticatedClient(token);

            const metaList = await this.dbOps.meta.list(supabase, workflowId);

            return { executions: metaList };
        },
        


        listActive: async (
            token:  Token.UserSupabaseJWT, 
            userId: Auth.User.Id
        ): Promise<Execution.API.Meta.ListActive.Response> => {
            const supabase = createAuthenticatedClient(token);
            await this.ownership.assertUserAdmin(userId);

            const executions = await this.dbOps.meta.listActive(supabase);

            return { executions: executions };
        }
    }
}
