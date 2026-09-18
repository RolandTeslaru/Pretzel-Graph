import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { WorkerService } from './worker.service';

// Reports whether this process is ready to consume executions.
@Controller('health')
export class HealthController {

    constructor(private readonly worker: WorkerService) {}




    @Get()
    check(): { status: string } {
        if (!this.worker.isReady())
            throw new ServiceUnavailableException('Worker is not ready');

        return { status: 'ok' };
    }
}
