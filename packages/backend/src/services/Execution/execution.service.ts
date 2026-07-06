import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import { SupabaseClient } from '@supabase/supabase-js';
import { createAuthenticatedClient, createServiceClient } from '@/utils/supabase';
import { REDIS_HOST, REDIS_PORT } from '@pretzel-graph/shared/constants';
import { Auth, Execution, Foundations, Validation, Vault, Workflow } from '@pretzel-graph/shared/domain';
import { CatalogueService, mapFieldValues } from '@pretzel-graph/node-sdk';
import { SystemError } from '@pretzel-graph/shared/domain/SystemError';
import { Algorithms } from '@pretzel-graph/shared/domain/Algorithms';
import { RealtimeService } from '../Realtime/realtime.service';
import { PermissionService } from '../Permission/permission.service';
import { Token } from '@/domain/Token';
import { ExecutionDatabase } from './execution.database';
import { ChatDatabase } from '../Chat/chat.database';
import { VaultDatabase } from '../Vault/vault.database';

@Injectable()
export class ExecutionService {

    private readonly queueEvents = new QueueEvents(Execution.Queue.ID, {
        connection: { host: REDIS_HOST, port: REDIS_PORT, maxRetriesPerRequest: null }
    });

    private readonly redis = new Redis({ host: REDIS_HOST, port: REDIS_PORT });

    private readonly serviceSupabase = createServiceClient();




    constructor(
        @InjectQueue(Execution.Queue.ID)
        private readonly executionQueue: Queue,
        private readonly realtime:       RealtimeService,
        private readonly ownership:      PermissionService,
        private readonly database:       ExecutionDatabase,
        private readonly chatDatabase:   ChatDatabase,
        private readonly vaultDatabase:  VaultDatabase,
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
        const ownerId = await this.ownership.assertWorkflow(payload.workflowId, userId);
        return this.runCore(supabase, ownerId, payload, payload.igniter);
    }





    public async runFromService(
        payload: Execution.API.Run.InternalRequest,
        service: string,
    ): Promise<Execution.API.Run.Response> {

        const ownerId = await this.ownership.loadWorkflowOwner(payload.workflowId);

        return this.runCore(this.serviceSupabase, ownerId, payload, payload.igniter);
    }

    public async runFromSdk(
        userId:  Auth.User.Id,
        payload: Execution.API.SdkRun.Request,
    ): Promise<Execution.API.SdkRun.Response> {
        const workflowData = await this.database.getActivePublishedWorkflowData(this.serviceSupabase, payload.workflowId);
        const igniter: Execution.Igniter = { variant: 'sdk', record: false, inputs: payload.inputs };

        const runPayload: Execution.API.Run.Request = { workflowId: payload.workflowId, workflowData, igniter };
        const result = await this.runCore(this.serviceSupabase, userId, runPayload, igniter);

        if (payload.await) return result;

        return { executionId: result.execution.id };
    }




    // Resolve each node's (possibly reconciled) blueprint so validation can derive fields/ports.
    private async resolveBlueprints(
        workflowData: Workflow.Data,
    ): Promise<Record<Foundations.Blueprint.Id, Foundations.Blueprint>> {
        const blueprints: Record<Foundations.Blueprint.Id, Foundations.Blueprint> = {};

        for (const node of Object.values(workflowData.nodes)) {
            const base = await CatalogueService.loadBlueprint(node.blueprintId);

            // Subworkflow dependency node: absent from the catalogue by design. Its blueprint is the
            // Core.SubWorkflow.Execute container's — exposed ports derive from the embedded dependency
            // at read time (resolveInputs/Outputs). Mirrors the compiler's resolveDependencyNode.
            if (!base) {
                if (node.dependencyRef) {
                    const executeBp = await CatalogueService.loadBlueprint("Core.SubWorkflow.Execute" as Foundations.Blueprint.Id);
                    if (executeBp) blueprints[node.blueprintId] = executeBp;
                }
                continue;
            }

            if (node.reconciledBlueprintId) {
                const fieldValues = mapFieldValues(base.fields, workflowData.staticValues[node.id] ?? {});
                const reconciled = await CatalogueService.reconcile(node.blueprintId, fieldValues);
                if (reconciled) blueprints[node.reconciledBlueprintId] = reconciled;
            } else {
                blueprints[node.blueprintId] = base;
            }
        }

        return blueprints;
    }

    private async runCore(
        supabase: SupabaseClient,
        userId:   Auth.User.Id,
        payload:  Execution.API.Run.Request,
        igniter:  Execution.Igniter,
    ): Promise<Execution.API.Run.Response> {
        const { workflowId, chat_id } = payload;
        const workflowData = payload.workflowData;

        const wfCache = Workflow.createCache(workflowData);
        // Validation
        const arcsMap = Workflow.deriveArcs(wfCache);
        const sccs   = Algorithms.Tarjan.deriveSCCs(workflowData.nodes, arcsMap)[3];
        const cycles = Algorithms.Johnson.getAllCycles(arcsMap, sccs);
        
        const issues = Validation.Issue.checkWorkflow(workflowData, cycles, wfCache, await this.resolveBlueprints(workflowData));

        if (Validation.workflowHasIssues(issues))
            throw new SystemError(
                SystemError.Code.CONFIG_INVALID_FIELD,
                'Workflow has nodes with missing fields or inputs — fix them before running',
                { data: { issues } }
            );

        if (payload.chat_id)
            await this.chatDatabase.chat.ensure(supabase, userId, payload.chat_id, workflowId);

        const session = Execution.Session.createInitial();
        const executionId = await this.database.create(supabase, { workflowId, userId, igniter, session, executionId: payload.executionId, chatId: payload.chat_id });

        const execution = {
            id: executionId,
            session,
            recording: null,
            igniter,
            workflow_id: workflowId,
            chat_id,
            status: "running",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            duration: 0
        } satisfies Execution
        

        try {
            const credentialInstanceIds = collectCredentialInstanceIds(workflowData);
            const instances = await this.vaultDatabase.credentialInstance.listByIds(supabase, [...credentialInstanceIds]);
            const credentialInstances = Object.fromEntries(instances.map(i => [i.id, i])) as Record<Vault.Credential.Instance.Id, Vault.Credential.Instance>;

            const queueItem: Execution.Queue.Item = {
                execution,
                workflowId,
                workflowData,
                credentialInstances,
            };

            await this.executionQueue.add('run', queueItem, { jobId: executionId });

        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            await this.database.update(supabase, { executionId, status: 'failed', error: message });
            throw error;
        }

        const started = await this.realtime.awaitEvent(
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
                recording: null,
                created_at: now,
                updated_at: now,
            },
            isRecording: payload.igniter.record ?? false,
        };
    }




    public async pause(
        token:   Token.UserSupabaseJWT,
        userId:  Auth.User.Id,
        payload: Execution.API.Pause.Request,
    ): Promise<Execution.API.Pause.Response> {
        const { executionId } = payload;
        const supabase = createAuthenticatedClient(token);

        await this.ownership.assertExecution(executionId, userId);

        const success = await this.realtime.signalAndAwaitEvent<Execution.Signal.Pause>(
            { channel: Execution.Signal.getChannel(executionId), type: 'pause', executionId },
            Execution.Event.getChannel(executionId),
            'paused',
        );

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

        await this.ownership.assertExecution(executionId, userId);

        const success = await this.realtime.signalAndAwaitEvent<Execution.Signal.Resume>(
            { channel: Execution.Signal.getChannel(executionId), type: 'resume', executionId },
            Execution.Event.getChannel(executionId),
            'resumed',
        );

        if (success) await this.database.update(supabase, { executionId, status: 'running' });
        return { success };
    }




    public async heartbeat(
        token:   Token.UserSupabaseJWT,
        userId:  Auth.User.Id,
        payload: Execution.API.Heartbeat.Request,
    ): Promise<Execution.API.Heartbeat.Response> {
        const { executionId } = payload;

        await this.ownership.assertExecution(executionId, userId);

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

        await this.ownership.assertExecution(executionId, userId);

        const success = await this.realtime.signalAndAwaitEvent<Execution.Signal.Suspend>(
            { channel: Execution.Signal.getChannel(executionId), type: 'suspend', executionId },
            Execution.Event.getChannel(executionId),
            'suspended',
        );

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
        await this.ownership.assertExecution(executionId, userId);

        const success = await this.realtime.signalAndAwaitEvent<Execution.Signal.Terminate>(
            { channel: Execution.Signal.getChannel(executionId), type: 'terminate', executionId },
            Execution.Event.getChannel(executionId),
            'terminated',
        );

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

        await this.ownership.assertExecution(executionId, userId);

        const execution = await this.database.get(supabase, executionId);

        return { execution };
    }




    public async update(
        payload: Execution.API.Update.Request
    ): Promise<Execution.API.Update.Response> {
        const { executionId, status, session, recording } = payload;
        await this.database.update(this.serviceSupabase, { executionId, status, session, recording });
        return {};
    }


    public readonly recording = {

        getLive: async (
            token:   Token.UserSupabaseJWT,
            userId:  Auth.User.Id,
            payload: Execution.API.Recording.GetLive.Request,
        ): Promise<Execution.API.Recording.GetLive.Response> => {
            await this.ownership.assertExecution(payload.executionId, userId);
            const key = Execution.Event.getChannel(payload.executionId);
            const raw = await this.redis.get(key);
            if (!raw) throw new SystemError(SystemError.Code.NOT_FOUND, 'Live recording not found or expired');
            const recording = Execution.Recording.Schema.parse(JSON.parse(raw));
            return { recording };
        },

    };

    public meta = {

        get: async (
            token:   Token.UserSupabaseJWT,
            userId:  Auth.User.Id,
            payload: Execution.API.Meta.Get.Request
        ): Promise<Execution.API.Meta.Get.Response> => {
            const supabase = createAuthenticatedClient(token);
            const { executionId } = payload;

            await this.ownership.assertExecution(executionId, userId);

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

function collectCredentialInstanceIds(workflowData: Workflow.Data): Set<Vault.Credential.Instance.Id> {
    const ids = new Set<Vault.Credential.Instance.Id>();
    for (const nodeMap of Object.values(workflowData.credentialInstanceIds))
        for (const instanceId of Object.values(nodeMap) as Vault.Credential.Instance.Id[])
            ids.add(instanceId);
    for (const dep of Object.values(workflowData.dependencies.published))
        collectCredentialInstanceIds(dep.workflow_data).forEach(id => ids.add(id));
    for (const dep of Object.values(workflowData.dependencies.draft))
        collectCredentialInstanceIds(dep.workflow_data).forEach(id => ids.add(id));
    return ids;
}
