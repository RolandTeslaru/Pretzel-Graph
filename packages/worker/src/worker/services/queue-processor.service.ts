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

// Runs one queued execution from compile to its reported outcome.
@Injectable()
export class QueueProcessorService {

    private readonly compiler = new TurboGraph();

    constructor(
        private readonly signals: SignalHandlerService,
        private readonly locks: LockService,
        private readonly bookkeeping: BookkeepingService,
        private readonly realtime: RealtimeService,
        private readonly axios: AxiosService,
    ) {}




    public processJob = async (
        bullJob: BullJob<Execution.Queue.Item>,
        token?: string
    ) => {
        const { workflowId, workflowData, execution, credentialInstances, executionToken } = bullJob.data;
        const executionId = execution.id;
        const { igniter } = execution;

        console.log(`Processing job ${bullJob.id} for workflow ${workflowId} with execution id ${execution.id}`);

        // Scope lives for the whole job; all emits/awaits go through it.
        const scope = this.realtime.createScope(executionId, workflowId)

        scope.onSignal(Execution.Signal.Schema, signal => this.signals.handle(signal));

        // One isolate per execution; disposed in `finally`.
        const airlock = new AirlockService();
        const origin  = performance.now();

        const onPauseTimeout = () => {
            console.log(`[Worker] Max pause duration reached for job ${bullJob.id}, terminating`);
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

            console.error("Error during execution of job", execution.id, systemError.message, systemError.detail || "");

            const session = executionCtx.session;

            const recording = igniter.record ? recorder.getRecording() : null;
            const duration = performance.now() - origin;

            await Execution.API.update(this.axios.api, { executionId: execution.id, status: 'failed', duration, session, recording }).catch(() => {});

            scope.emit(Execution.Event.create("lifecycle:failed", {
                error: systemError.toJSON(),
                session,
            }));

            if (recording) {
                await this.realtime.cacheRecording(execution.id, recording)
                    .catch(redisErr => console.error('[Worker] Failed to cache recording:', redisErr));

                scope.emit(Execution.Event.create("recording:fullyUploaded"))
            }

            return { status: 'failed', error: systemError.toJSON() };

        } finally {
            this.locks.stop(executionId);
            console.log("Deleting job", execution.id, "from running engines and contexts")

            airlock.dispose();
            this.bookkeeping.remove(execution.id);

            scope.close();
        }
    }
}
