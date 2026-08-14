import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import { Principal } from '@/domain/Principal';
import { DB } from '@/db';
import { REDIS_HOST, REDIS_PORT } from '@pretzel-graph/shared/constants';
import { Auth, Execution, Validation, Vault, Workflow } from '@pretzel-graph/shared/domain';
import { CatalogueService } from '@pretzel-graph/node-sdk';
import { SystemError } from '@pretzel-graph/shared/domain/SystemError';
import { Algorithms } from '@pretzel-graph/shared/domain/Algorithms';
import { RealtimeService } from '../Realtime/realtime.service';
import { PermissionService } from '../Permission/permission.service';
import { ExecutionDatabase } from './execution.database';
import { ChatDatabase } from '../Chat/chat.database';
import { VaultDatabase } from '../Vault/vault.database';
import { Blueprint } from '@pretzel-graph/shared/domain/Foundations/Blueprint';
import { ExecutionToken } from '@/auth/execution-token';

@Injectable()
export class ExecutionService {

    private readonly queueEvents = new QueueEvents(Execution.Queue.ID, {
        connection: { host: REDIS_HOST, port: REDIS_PORT, maxRetriesPerRequest: null }
    });

    private readonly redis = new Redis({ host: REDIS_HOST, port: REDIS_PORT });

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
            await DB.asService('mark failed BullMQ execution', (db) => this.database.finalise(db, { executionId: jobId as Execution.Id, status, error: failedReason }));
        });
    }




    // Attributed to whoever triggered it.
    public async runFromUser(
        principal:  Principal.User,
        workflowId: Workflow.Id,
        payload:    Execution.API.Run.Request,
    ): Promise<Execution.API.Run.Response> {
        return this.runCore(principal.userId, workflowId, payload, payload.igniter);
    }





    /** A trigger with no user session behind it. */
    public async runFromService(
        payload: Execution.API.Run.InternalRequest,
        service: string,
    ): Promise<Execution.API.Run.Response> {
        void service;

        // No human behind this run; `igniter` records what triggered it.
        return this.runCore(null, payload.workflowId, payload, payload.igniter);
    }




    // Resolve each node's derivative blueprint so validation sees its final fields and ports.
    private async resolveBlueprints(
        workflowData: Workflow.Data,
    ): Promise<Record<Blueprint.Id, Blueprint>> {
        const blueprints: Record<Blueprint.Id, Blueprint> = {};

        for (const node of Object.values(workflowData.nodes)) {
            // Subworkflow dependency node: absent from the catalogue by design, so never attempt the
            // path-convention import. Its blueprint is the Core.SubWorkflow.Execute container's —
            // exposed ports derive from the embedded dependency at read time (resolveInputs/Outputs).
            // Mirrors the compiler's resolveDependencyNode.
            if (node.dependencyRef) {
                const executeBp = await CatalogueService.loadBaseBlueprint("Core.SubWorkflow.Execute" as Blueprint.Id);

                if (executeBp) blueprints[node.blueprintId] = executeBp;

                continue;
            }

            const base = await CatalogueService.loadBaseBlueprint(node.blueprintId);

            if (!base) continue;

            if (node.reconciledBlueprintId) {
                const path = Blueprint.isReconciledId(node.reconciledBlueprintId)
                    ? node.reconciledBlueprintId.slice(base.id.length + 1)
                    : null;
                const derived = path
                    ? Blueprint.deriveByPath(base, path)
                    : Blueprint.derive(base, workflowData.staticValues[node.id] ?? {}).blueprint;
                blueprints[node.reconciledBlueprintId] = derived;
            } else {
                blueprints[node.blueprintId] = base;
            }
        }

        return blueprints;
    }

    /** `userId` is attribution only — null when a machine triggered the run. */
    private async runCore(
        userId:     Auth.User.Id | null,
        workflowId: Workflow.Id,
        payload:    Execution.API.Run.Request,
        igniter:    Execution.Igniter,
    ): Promise<Execution.API.Run.Response> {
        const withDatabase = <T>(fn: (trx: DB.UserTransaction) => Promise<T>) => DB.asUser({ userId }, fn);

        const chatId = igniter.chat_id;
        const workflowData = payload.workflowData;

        const blueprints = await this.resolveBlueprints(workflowData);
        const wfCache = Workflow.createCache(workflowData, blueprints);
        // Validation
        const arcsMap = Workflow.deriveArcs(wfCache);
        const sccs    = Algorithms.Tarjan.deriveSCCs(workflowData.nodes, arcsMap)[3];
        const cycles  = Algorithms.Johnson.getAllCycles(arcsMap, sccs);
        
        const issues = Validation.Issue.checkWorkflow(workflowData, cycles, wfCache);

        if (Validation.workflowHasIssues(issues))
            throw new SystemError(
                SystemError.Code.CONFIG_INVALID_FIELD,
                'Workflow has nodes with missing fields or inputs — fix them before running',
                { data: { issues } }
            );

        if (chatId)
            await withDatabase((db) => this.chatDatabase.chat.ensure(db, userId, chatId, workflowId));

        const session = Execution.Session.createInitial();
        const executionId = await withDatabase((db) => this.database.create(db, { workflowId, createdBy: userId, igniter, session, executionId: payload.executionId, chatId }));

        const execution = {
            id: executionId,
            session,
            recording: null,
            igniter,
            workflow_id: workflowId,
            status: "running",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            duration: 0
        } satisfies Execution
        

        try {
            const credentialInstanceIds = collectCredentialInstanceIds(workflowData);
            const instances = await withDatabase((db) => this.vaultDatabase.credentialInstance.listByIds(db, [...credentialInstanceIds]));
            const credentialInstances = Object.fromEntries(instances.map(i => [i.id, i])) as Record<Vault.Credential.Instance.Id, Vault.Credential.Instance>;

            const queueItem: Execution.Queue.Item = {
                execution,
                workflowId,
                workflowData,
                credentialInstances,
                executionToken: ExecutionToken.sign(executionId),
            };

            await this.executionQueue.add('run', queueItem, { jobId: executionId });

        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            await DB.asService('mark execution failed at enqueue', (db) => this.database.finalise(db, { executionId, status: 'failed', error: message }));
            throw error;
        }

        const started = await this.realtime.awaitEvent(
            Execution.Event.getChannel(executionId),
            'lifecycle:started',
            10_000
        );

        if (!started) {
            await DB.asService('mark execution failed — no worker', (db) => this.database.finalise(db, { executionId, status: 'failed', error: 'No worker picked up the job' }));
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
        principal:   Principal.User,
        executionId: Execution.Id,
    ): Promise<Execution.API.Pause.Response> {

        const success = await this.realtime.signalAndAwaitEvent<Execution.Signal.Pause>(
            { channel: Execution.Signal.getChannel(executionId), type: 'pause', executionId },
            Execution.Event.getChannel(executionId),
            'lifecycle:paused',
        );

        if (success) 
            await DB.asUser(principal, (db) => this.database.updateProgress(db, { executionId, status: 'paused' }));
       
        return { success };
    }




    public async resume(
        principal:   Principal.User,
        executionId: Execution.Id,
    ): Promise<Execution.API.Resume.Response> {

        const success = await this.realtime.signalAndAwaitEvent<Execution.Signal.Resume>(
            { channel: Execution.Signal.getChannel(executionId), type: 'resume', executionId },
            Execution.Event.getChannel(executionId),
            'lifecycle:resumed',
        );

        if (success) 
            await DB.asUser(principal, (db) => this.database.updateProgress(db, { executionId, status: 'running' }));
        
        return { success };
    }




    public async heartbeat(
        principal:   Principal.User,
        executionId: Execution.Id,
    ): Promise<Execution.API.Heartbeat.Response> {

        const channel = Execution.Signal.getChannel(executionId)

        this.realtime.emitSignal<Execution.Signal.Heartbeat>({
            channel,
            type: 'heartbeat',
            executionId,
        });
        return {};
    }




    public async suspend(
        principal:   Principal.User,
        executionId: Execution.Id,
    ): Promise<Execution.API.Suspend.Response> {

        const success = await this.realtime.signalAndAwaitEvent<Execution.Signal.Suspend>(
            { channel: Execution.Signal.getChannel(executionId), type: 'suspend', executionId },
            Execution.Event.getChannel(executionId),
            'lifecycle:suspended',
        );

        if (success) await DB.asUser(principal, (db) => this.database.updateProgress(db, { executionId, status: 'suspended' }));
        return { success };
    }




    public async terminate(
        principal:   Principal.User,
        executionId: Execution.Id,
    ): Promise<Execution.API.Terminate.Response> {

        const success = await this.realtime.signalAndAwaitEvent<Execution.Signal.Terminate>(
            { channel: Execution.Signal.getChannel(executionId), type: 'terminate', executionId },
            Execution.Event.getChannel(executionId),
            'lifecycle:terminated',
        );

        if (success) 
            await DB.asUser(principal, (db) => this.database.updateProgress(db, { executionId, status: 'terminated' }));
        
        return { success };
    }




    public async finalise({ executionId, status }: Execution.API.Finalise.Request): Promise<Execution.API.Finalise.Response> {
        await DB.asService('finalise execution', (db) => this.database.finalise(db, { executionId, status }));
        return {};
    }





    public async terminateAll(
        principal: Principal.User,
    ): Promise<Execution.API.TerminateAll.Response> {
        await this.ownership.assertUserAdmin(principal.userId);

        const activeExecutionIds = await DB.asService('list active executions for termination', (db) => this.database.listActiveIds(db));
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

        const terminateActive = (trx: DB.Transaction<'user' | 'service'>) => this.database.terminateMany(trx, activeExecutionIds, 'Terminated by admin');

        await DB.asService('terminate active executions', terminateActive);

        return { terminatedCount: activeExecutionIds.length };
    }




    // No ownership assert: the read runs through RLS, which confines it to the caller's own
    // executions. A row that is not theirs is not visible, and the resulting no-row throw
    // surfaces as the same 404 the assert used to produce.
    public async get(
        principal:   Principal.User,
        executionId: Execution.Id,
    ): Promise<Execution.API.Get.Response> {

        const execution = await DB.asUser(principal, (db) => this.database.get(db, executionId));

        return { execution };
    }




    public async update(
        payload: Execution.API.Update.Request
    ): Promise<Execution.API.Update.Response> {
        const { executionId, status, duration, session, recording } = payload;
        // Progress from the running graph — written as the execution's owner, so RLS
        // scopes it. Terminal results arrive on /finalise, which stays on the service role.
        const delegate = await this.ownership.resolveDelegate(executionId);

        await DB.asDelegate(delegate, (trx) => this.database.updateProgress(trx, { executionId, status, duration, session, recording }));
        return {};
    }


    public readonly recording = {

        // Reads Redis, which RLS does not reach — the route's execution scope is the only
        // thing confining this to the caller's own run.
        getLive: async (
            executionId: Execution.Id,
        ): Promise<Execution.API.Recording.GetLive.Response> => {
            const key = Execution.Event.getChannel(executionId);
            const raw = await this.redis.get(key);

            if (!raw) 
                throw new SystemError(SystemError.Code.NOT_FOUND, 'Live recording not found or expired');

            const recording = Execution.Recording.Schema.parse(JSON.parse(raw));
            return { recording };
        },

    };

    public meta = {

        get: async (
            principal:   Principal.User,
            executionId: Execution.Id,
        ): Promise<Execution.API.Meta.Get.Response> => {

            const meta = await DB.asUser(principal, (db) => this.database.meta.get(db, executionId));

            return { execution: meta };
        },


        list: async (
            principal:  Principal.User,
            workflowId: Workflow.Id,
        ): Promise<Execution.API.Meta.List.Response> => {

            const metaList = await DB.asUser(principal, (db) => this.database.meta.list(db, workflowId));

            return { executions: metaList };
        },



        listActive: async (
            principal: Principal.User,
        ): Promise<Execution.API.Meta.ListActive.Response> => {
            await this.ownership.assertUserAdmin(principal.userId);

            const executions = await DB.asUser(principal, (db) => this.database.meta.listActive(db));

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
