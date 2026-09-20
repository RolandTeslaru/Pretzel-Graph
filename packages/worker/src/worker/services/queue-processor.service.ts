import { Injectable } from '@nestjs/common';
import { Job as BullJob } from 'bullmq';
import { Execution } from '@pretzel-graph/shared/domain';
import { SystemError } from '@pretzel-graph/shared/domain/SystemError';
import { AggexEngine, AggexHooks } from 'src/engine';
import { FlightRecorderService } from '../../engine/flight-recorder-service';
import { TurboGraph } from '../../turboGraph';
import { createInternalClient } from '../../turboGraph/http';
import { AirlockService } from '../../airlock';
import { AxiosService } from '../../axios';
import { RealtimeService } from '../../realtime/realtime.service';
import { BookkeepingService } from './bookkeeping.service';
import { LockService } from './lock.service';
import { SignalHandlerService } from './signal-handler.service';
import { System } from '@pretzel-graph/shared/system';
import { CatalogueService } from '../../catalogue';
import { ConnectionService } from '../../connections';

// Runs one queued execution from compile to its reported outcome.
@Injectable()
export class QueueProcessorService {

    private readonly log = System.log.withContext("QueueProcessor");

    private readonly compiler: TurboGraph;

    constructor(
        private readonly signals: SignalHandlerService,
        private readonly locks: LockService,
        private readonly bookkeeping: BookkeepingService,
        private readonly realtime: RealtimeService,
        private readonly axios: AxiosService,
        private readonly catalogue: CatalogueService,
        private readonly connections: ConnectionService,
    ) {
        this.compiler = new TurboGraph(catalogue);
    }




    public processJob = async (
        bullJob: BullJob<Execution.Queue.Item>,
        token?: string
    ) => {
        const { workflowId, workflowData, execution, credentialInstances, executionToken } = bullJob.data;
        const executionId = execution.id;
        const { igniter } = execution;

        this.log.info("execution started", { executionId: execution.id, workflowId, jobId: bullJob.id });

        // Scope lives for the whole job; all emits/awaits go through it.
        const scope = this.realtime.createScope(executionId, workflowId)

        scope.onSignal(Execution.Signal.Schema, signal => this.signals.handle(signal));

        // One isolate per execution; disposed in `finally`.
        const airlock = new AirlockService();
        const origin  = performance.now();

        const onPauseTimeout = () => {
            this.log.warning("max pause duration reached, terminating", { jobId: bullJob.id });
            engine.ctx.abortAPI.abort()
            engine.resume();
        };

        // Not from httpClientFactory: that would route the token through a node proxy.
        const internalAPI = createInternalClient(executionToken);

        const aggexHooks: AggexHooks = {
            onPause: () => {
                this.locks.startLockExtension(executionId, bullJob, token);
                this.locks.startPauseLimit(executionId, onPauseTimeout);
                scope.emit(Execution.Event.create("lifecycle:paused", {
                    session: engine.ctx.session,
                }));
            },
            onResume: () => {
                this.locks.stop(executionId);
                scope.emit(Execution.Event.create("lifecycle:resumed", {
                    session: engine.ctx.session,
                }));
            },
        };

        const engine = new AggexEngine({
            hooks: aggexHooks,
            execution,
            workflowId,
            workflowData,
            airlock,
            credentialInstances,
            realtime: scope,
            internalAPI,
            catalogue: this.catalogue,
            connectionAPI: this.connections,
        });

        const executionCtx = engine.ctx;

        const recorder = new FlightRecorderService(executionCtx, origin);
        if(igniter.record)
            engine.attachFlightRecorder(recorder);

        this.bookkeeping.add(executionId, engine);

        scope.emit(Execution.Event.create("lifecycle:started"));

        await Execution.API.update(this.axios.api, { executionId, status: 'running' }).catch(() => {});

        try {
            await this.compiler.compile(executionCtx);

            const result = await engine.run();

            const session = executionCtx.session;
            const status = result.status === 'terminated' ? 'terminated' : 'completed';

            const recording = igniter.record ? recorder.getRecording() : null;
            const duration = performance.now() - origin;

            await Execution.API.update(this.axios.api, { executionId, status, duration, session, recording });

            this.log.info("execution finished", { executionId, status, ms: duration });

            if (status === 'terminated')
                scope.emit(Execution.Event.create("lifecycle:terminated"));
            else
                scope.emit(Execution.Event.create("lifecycle:completed", { session }));

            if (recording) {
                await this.realtime.cacheRecording(executionId, recording);
                scope.emit(Execution.Event.create("recording:fullyUploaded"))
            }

            return { status };

        } catch (err: unknown) {
            const systemError = SystemError.fromUnknown(err)

            const session = executionCtx.session;

            const recording = igniter.record ? recorder.getRecording() : null;
            const duration = performance.now() - origin;

            this.log.error("execution failed", {
                executionId: execution.id,
                ms:          duration,
                message:     systemError.message,
                detail:      systemError.detail || "",
            });

            await Execution.API.update(this.axios.api, { executionId: execution.id, status: 'failed', duration, session, recording }).catch(() => {});

            scope.emit(Execution.Event.create("lifecycle:failed", {
                error: systemError.toJSON(),
                session,
            }));

            if (recording) {
                await this.realtime.cacheRecording(execution.id, recording)
                    .catch(redisErr => this.log.error("failed to cache recording", { executionId: execution.id, error: redisErr }));

                scope.emit(Execution.Event.create("recording:fullyUploaded"))
            }

            return { status: 'failed', error: systemError.toJSON() };

        } finally {
            this.locks.stop(executionId);
            this.log.debug("releasing engine and context", { executionId: execution.id })

            airlock.dispose();
            this.bookkeeping.remove(execution.id);

            scope.close();
        }
    }
}
