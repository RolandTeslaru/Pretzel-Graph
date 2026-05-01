import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, QueueEvents } from 'bullmq';
import { SupabaseClient } from '@supabase/supabase-js';
import { createAuthenticatedClient, createServiceClient } from '@/utils/supabase';
import { REDIS_HOST, REDIS_PORT } from '@pretzel-graph/shared/constants';
import { Auth, Execution, Validation, Workflow } from '@pretzel-graph/shared/domain';
import { SystemError } from '@pretzel-graph/shared/domain/SystemError';
import { Algorithms } from '@pretzel-graph/shared/domain/Algorithms';
import { RealtimeService } from '../Realtime/realtime.service';
import { SecretsResolver } from './utils';
import { PermissionService } from '../Permission/permission.service';
import { Token } from '@/domain/Token';
import { ExecutionDatabase } from './execution.database';

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
        private readonly database:       ExecutionDatabase,
    ) {
        this.queueEvents.on('failed', async ({ jobId, failedReason }) => {
            console.error(`[Execution] ${jobId} failed:`, failedReason);
            const status = failedReason === 'terminated' ? 'terminated' : 'failed';
            await this.database.update(this.serviceSupabase, { executionId: jobId as Execution.Id, status, error: failedReason });
        });
    }




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

    public async runFromSdk(
        userId:  Auth.User.Id,
        payload: Execution.API.SdkRun.Request,
    ): Promise<Execution.API.SdkRun.Response> {
        const workflowData = await this.database.getActivePublishedWorkflowData(this.serviceSupabase, payload.workflowId);
        const igniter: Execution.Igniter = { variant: 'sdk', inputs: payload.inputs };

        const runPayload: Execution.API.Run.Request = { workflowId: payload.workflowId, workflowData };
        const result = await this.runCore(this.serviceSupabase, userId, runPayload, igniter);

        if (payload.await) return result;

        return { executionId: result.execution.id };
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
        const executionId = await this.database.create(supabase, { workflowId, userId, igniter, session, executionId: payload.executionId });

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
            await this.database.update(supabase, { executionId, status: 'failed', error: message });
            throw error;
        }

        const started = await this.realtime.withEventConfirmation(
            Execution.Event.getChannel(executionId),
            'started',
            10_000
        );

        if (!started) {
            await this.database.update(supabase, { executionId, status: 'failed', error: 'No worker picked up the job' });
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




    public async pause(
        token:   Token.UserSupabaseJWT,
        userId:  Auth.User.Id,
        payload: Execution.API.Pause.Request,
    ): Promise<Execution.API.Pause.Response> {
        const { executionId } = payload;
        const supabase = createAuthenticatedClient(token);

        await this.ownership.assertExecution(supabase, executionId, userId);

        const eventChannel  = Execution.Event.getChannel(executionId);
        const signalChannel = Execution.Signal.getChannel(executionId);

        const confirmation = this.realtime.withEventConfirmation(eventChannel, 'paused');

        this.realtime.emitSignal<Execution.Signal.Pause>({
            channel: signalChannel,
            type: 'pause',
            executionId,
        });

        const success = await confirmation;
        if (success) await this.database.update(supabase, { executionId, status: 'paused' });
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

        const eventChannel  = Execution.Event.getChannel(executionId);
        const signalChannel = Execution.Signal.getChannel(executionId);

        const confirmation = this.realtime.withEventConfirmation(eventChannel, 'resumed');

        this.realtime.emitSignal<Execution.Signal.Resume>({
            channel: signalChannel,
            type: 'resume',
            executionId,
        });

        const success = await confirmation;
        if (success) await this.database.update(supabase, { executionId, status: 'running' });
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

        const eventChannel  = Execution.Event.getChannel(executionId);
        const signalChannel = Execution.Signal.getChannel(executionId);

        const confirmation = this.realtime.withEventConfirmation(eventChannel, 'suspended');

        this.realtime.emitSignal<Execution.Signal.Suspend>({
            channel: signalChannel,
            type: 'suspend',
            executionId,
        });

        const success = await confirmation;
        if (success) await this.database.update(supabase, { executionId, status: 'suspended' });
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

        const eventChannel  = Execution.Event.getChannel(executionId);
        const signalChannel = Execution.Signal.getChannel(executionId);

        const confirmation = this.realtime.withEventConfirmation(eventChannel, 'terminated');

        this.realtime.emitSignal<Execution.Signal.Terminate>({
            channel: signalChannel,
            type: 'terminate',
            executionId,
        });

        const success = await confirmation;
        if (success) await this.database.update(supabase, { executionId, status: 'terminated' });
        return { success };
    }




    public async finalise({ executionId, status }: Execution.API.Finalise.Request): Promise<Execution.API.Finalise.Response> {
        await this.database.update(this.serviceSupabase, { executionId, status });
        return {};
    }





    public async terminateAll(
        token:  Token.UserSupabaseJWT,
        userId: Auth.User.Id
    ): Promise<Execution.API.TerminateAll.Response> {
        await this.ownership.assertUserAdmin(userId);

        const activeExecutionIds = await this.database.listActiveIds(this.serviceSupabase);
        if (activeExecutionIds.length === 0) return { terminatedCount: 0 };

        for (const executionId of activeExecutionIds) {
            this.realtime.emitSignal<Execution.Signal.Terminate>({
                channel: Execution.Signal.getChannel(executionId),
                type: 'terminate',
                executionId,
            });
        }

        const waiting = await this.executionQueue.getJobs(['waiting', 'delayed']);
        for (const job of waiting) 
            await job.remove();

        await this.database.terminateMany(this.serviceSupabase, activeExecutionIds, 'Terminated by admin');

        return { terminatedCount: activeExecutionIds.length };
    }




    public async get(
        token:   Token.UserSupabaseJWT,
        userId:  Auth.User.Id, 
        payload: Execution.API.Get.Request
    ): Promise<Execution.API.Get.Response> {
        const { executionId } = payload;
        const supabase = createAuthenticatedClient(token);

        await this.ownership.assertExecution(supabase, executionId, userId);

        const execution = await this.database.get(supabase, executionId);

        return { execution };
    }




    public async update(
        payload: Execution.API.Update.Request
    ): Promise<Execution.API.Update.Response> {
        const { executionId, status, session } = payload;
        await this.database.update(this.serviceSupabase, { executionId, status, session });
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

            const meta = await this.database.meta.get(supabase, executionId);

            return { execution: meta };
        },


        list: async (
            token:   Token.UserSupabaseJWT, 
            payload: Execution.API.Meta.List.Request
        ): Promise<Execution.API.Meta.List.Response> => {
            const { workflowId } = payload;
            const supabase = createAuthenticatedClient(token);

            const metaList = await this.database.meta.list(supabase, workflowId);

            return { executions: metaList };
        },
        


        listActive: async (
            token:  Token.UserSupabaseJWT, 
            userId: Auth.User.Id
        ): Promise<Execution.API.Meta.ListActive.Response> => {
            const supabase = createAuthenticatedClient(token);
            await this.ownership.assertUserAdmin(userId);

            const executions = await this.database.meta.listActive(supabase);

            return { executions: executions };
        }
    }
}
