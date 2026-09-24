import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, QueueEvents } from 'bullmq';
import { Principal } from '@/domain/Principal';
import { REDIS_HOST, REDIS_PORT, REDIS_PASSWORD } from '@pretzel-graph/shared/constants';
import { Execution, Validation, Workbench, Workflow } from '@pretzel-graph/shared/domain';
import { SystemError } from '@pretzel-graph/shared/domain/SystemError';
import { Algorithms } from '@pretzel-graph/shared/domain/Algorithms';
import { RealtimeService } from '../Realtime/realtime.service';
import { ExecutionRepository } from './execution.repository';
import { ExecutionTracker } from './execution.tracker';
import { ChatService } from '../Chat/chat.service';
import { VaultService } from '../Vault/vault.service';
import { WorkbenchRepository } from '../Workbench/workbench.repository';
import { ExecutionToken } from '@/auth/execution-token';
import { WorkerLifecycleService } from '../Worker/worker-lifecycle.service';
import { ShelfService } from '../Shelf/shelf.service';
import { System } from '@pretzel-graph/shared/system';

const log = System.log.withContext('Execution');

@Injectable()
export class ExecutionService {

    private readonly queueEvents = new QueueEvents(Execution.Queue.ID, {
        connection: { host: REDIS_HOST, port: REDIS_PORT, password: REDIS_PASSWORD, maxRetriesPerRequest: null }
    });

    constructor(
        @InjectQueue(Execution.Queue.ID)
        private readonly executionQueue:      Queue,
        private readonly realtime:            RealtimeService,
        private readonly repository:          ExecutionRepository,
        private readonly tracker:             ExecutionTracker,
        private readonly chats:               ChatService,
        private readonly vault:               VaultService,
        private readonly workbenchRepository: WorkbenchRepository,
        private readonly shelf:               ShelfService,
        
        @Inject(forwardRef(() => WorkerLifecycleService))
        private readonly workerLifecycle:     WorkerLifecycleService,
    ) {
        this.queueEvents.on('failed', async ({ jobId, failedReason }) => {
            log.error('queue job failed', { jobId, reason: failedReason });
            const status = failedReason === 'terminated' ? 'terminated' : 'failed';
            this.tracker.announce(await this.repository.finalise(Principal.SELF, { executionId: jobId as Execution.Id, status, error: failedReason }));
        });

        // A worker's idle window runs from its last job to end, whichever way it ended.
        this.queueEvents.on('failed',    ({ jobId }) => void this.workerLifecycle.noteJobEnded(jobId));
        this.queueEvents.on('completed', ({ jobId }) => void this.workerLifecycle.noteJobEnded(jobId));
    }




    // Attributed to whoever triggered it. Runs the saved graph when the caller sends none.
    public async runFromUser(
        principal:  Principal.User,
        workflowId: Workflow.Id,
        payload:    Execution.API.Run.Request,
    ): Promise<Execution.API.Run.Response> {
        const workflowData = payload.workflowData ?? (
                                await this.workbenchRepository.workflow.get(principal, workflowId)
                            ).data;

        const started      = await this.runCore(principal, workflowId, workflowData, payload.igniter, payload.executionId);

        if (!payload.await)
            return started;

        const { execution, settled } = await this.waitForSettled(principal, started.execution.id, payload.await.timeoutMs);

        return { ...started, execution, settled };
    }




    /**
     * The waiter is registered before the row is read: the worker writes the final status before
     * it emits the terminal event, so a run that settles in between is seen by the read, and one
     * that settles after is caught by the waiter.
     */
    public async waitForSettled(
        principal:   Principal.User,
        executionId: Execution.Id,
        timeoutMs:   number = Execution.API.Wait.DEFAULT_TIMEOUT_MS,
    ): Promise<Execution.API.Wait.Response> {
        const settled = this.realtime.awaitEvent(
            Execution.Event.getChannel(executionId),
            'lifecycle:completed',
            timeoutMs,
            event => Execution.Event.TERMINAL.has(event.type),
        );

        const current = await this.repository.get(principal, executionId);

        if (Execution.isSettled(current))
            return { execution: current, settled: true };

        const arrived   = await settled;
        const execution = arrived ? await this.repository.get(principal, executionId) : current;

        return { execution, settled: arrived };
    }




    /** A trigger with no user session behind it. */
    public async runFromService(
        payload: Execution.API.Run.InternalRequest,
        service: string,
    ): Promise<Execution.API.Run.Response> {
        // No human behind this run; `igniter` records what triggered it.
        const principal    = { type: 'service', service } as const;
        const workflowData = payload.workflowData ?? (await this.workbenchRepository.workflow.get(principal, payload.workflowId)).data;

        return this.runCore(principal, payload.workflowId, workflowData, payload.igniter, payload.executionId);
    }




    private async runCore(
        principal:    Principal.User | Principal.Service,
        workflowId:   Workflow.Id,
        workflowData: Workflow.Data,
        igniter:      Execution.Igniter,
        proposedId?:  Execution.Id,
    ): Promise<Execution.API.Run.Response> {
        const chatId = igniter.chat_id;

        const { blueprints, repairs } = await this.shelf.collectWorkflowBlueprints(workflowData);

        if (repairs.length > 0)
            throw new SystemError(
                SystemError.Code.CONFIG_INVALID_FIELD,
                'Workflow has nodes whose blueprints no longer exist — open it in the editor to repair them',
                { data: { repairs } }
            );

        const wfCache =Workbench.Document.createCache(workflowData, blueprints);
        // Validation
        const arcsMap = Workbench.Document.deriveArcs(wfCache);
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
            await this.chats.ensure(principal, workflowId, { chatId });

        const session = Execution.Session.createInitial();
        const created = await this.repository.create(principal, { workflowId, igniter, session, executionId: proposedId, chatId });
        const executionId = created.id;

        this.tracker.announce(created);

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
        

        let workerStarted: Promise<boolean>;

        try {
            const credentialInstanceIds = Workflow.collectCredentialInstanceIds(workflowData);
            const credentialInstances = await this.vault.credentialInstance.mapByIds(Principal.SELF, [...credentialInstanceIds]);

            const queueItem: Execution.Queue.Item = {
                execution,
                workflowId,
                workflowData,
                credentialInstances,
                executionToken: ExecutionToken.sign(executionId),
            };

            // Listening before the add, so a worker that picks the job up at once is not missed.
            workerStarted = this.realtime.awaitEvent(
                Execution.Event.getChannel(executionId),
                'lifecycle:started',
                10_000
            );

            await this.executionQueue.add('run', queueItem, { jobId: executionId });

            log.info('execution enqueued', { executionId, workflowId, igniter: igniter.variant });

            // After the add, so waiting on a machine to start never holds the job back.
            await this.workerLifecycle.ensureComputeForJob();

        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);

            log.error('failed to enqueue execution', { executionId, workflowId, error: message });

            this.tracker.announce(await this.repository.finalise(Principal.SELF, { executionId, status: 'failed', error: message }));
            throw error;
        }

        const started = await workerStarted;

        if (!started) {
            log.error('no worker picked up the job', { executionId, workflowId });

            this.tracker.announce(await this.repository.finalise(Principal.SELF, { executionId, status: 'failed', error: 'No worker picked up the job' }));
            this.executionQueue.remove(executionId).catch(err =>
                log.error('failed to remove execution from queue after start timeout', { error: err })
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
            isRecording: igniter.record ?? false,
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
            this.tracker.announce(await this.repository.updateProgress(principal, { executionId, status: 'paused' }));
       
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
            this.tracker.announce(await this.repository.updateProgress(principal, { executionId, status: 'running' }));
        
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

        if (success)
            this.tracker.announce(await this.repository.updateProgress(principal, { executionId, status: 'suspended' }));

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
            this.tracker.announce(await this.repository.updateProgress(principal, { executionId, status: 'terminated' }));
        
        return { success };
    }




    public async finalise({ executionId, status }: Execution.API.Finalise.Request): Promise<Execution.API.Finalise.Response> {
        this.tracker.announce(await this.repository.finalise(Principal.SELF, { executionId, status }));
        return {};
    }

    /**
     * Closes a run nobody is left to report on, with why. `update` cannot: the
     * error column is off its patch, so only the service role writes one.
     */
    public async fail(executionId: Execution.Id, error: string): Promise<void> {
        // Undefined when it settled first, which is the outcome that stands. The
        // session rides along for the event: `Meta` omits it, and an editor watching
        // this run applies the same payload a live failure would have sent.
        const closed = await this.repository.failIfActive(Principal.SELF, executionId, error);

        if (!closed)
            return;

        this.tracker.announce(closed.meta);

        // On the execution's own channel too: the board hears about it either way,
        // but an editor open on this run learns nothing from the activity channel.
        this.realtime.emitEvent({
            ...Execution.Event.create('lifecycle:failed', {
                session: closed.session,
                error:   closed.meta.error ?? new SystemError(SystemError.Code.INFRA_UNKNOWN, error).toJSON(),
            }),
            channel:     Execution.Event.getChannel(executionId),
            executionId,
            workflowId:  closed.meta.workflow_id,
        });
    }





    public async terminateAll(
        principal: Principal.User,
    ): Promise<Execution.API.TerminateAll.Response> {
        const activeExecutionIds = await this.repository.listActiveIds(Principal.SELF);
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

        const terminated = await this.repository.terminateMany(Principal.SELF, activeExecutionIds, 'Terminated by admin');

        terminated.forEach((meta) => this.tracker.announce(meta));

        return { terminatedCount: activeExecutionIds.length };
    }
}
