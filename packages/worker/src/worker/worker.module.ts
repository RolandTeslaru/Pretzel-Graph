import { Module } from '@nestjs/common';
import { AxiosModule } from '../axios/axios.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { BookkeepingService } from './services/bookkeeping.service';
import { LockService } from './services/lock.service';
import { QueueProcessorService } from './services/queue-processor.service';
import { SignalHandlerService } from './services/signal-handler.service';
import { HealthController } from './health.controller';
import { WorkerService } from './worker.service';
import { CatalogueService } from '../catalogue';
import { ConnectionService } from '../connections';

@Module({
    imports: [RealtimeModule, AxiosModule],
    controllers: [HealthController],
    providers: [
        WorkerService,
        QueueProcessorService,
        SignalHandlerService,
        LockService,
        BookkeepingService,
        CatalogueService,
        ConnectionService,
    ],
})
export class WorkerModule {}
