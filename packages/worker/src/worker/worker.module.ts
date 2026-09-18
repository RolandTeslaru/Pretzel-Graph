import { Module } from '@nestjs/common';
import { AxiosModule } from '../axios/axios.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { BookkeepingService } from './services/bookkeeping.service';
import { ConnectionPoolService } from './services/connection-pool.service';
import { LockService } from './services/lock.service';
import { QueueProcessorService } from './services/queue-processor.service';
import { SignalHandlerService } from './services/signal-handler.service';
import { WorkerService } from './worker.service';

@Module({
    imports: [RealtimeModule, AxiosModule],
    providers: [
        WorkerService,
        QueueProcessorService,
        SignalHandlerService,
        LockService,
        BookkeepingService,
        ConnectionPoolService,
    ],
})
export class WorkerModule {}
