import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Orchestrator } from '@vx-agent-editor/shared/domain';

export interface InboundWebhookJob {
    provider: string;
    event: string;
    payload: unknown;
    receivedAt: string;
}

@Injectable()
export class TriggerService {
    private readonly logger = new Logger(TriggerService.name);

    constructor(
        @InjectQueue(Orchestrator.EXECUTION_QUEUE_ID)
        private readonly executionQueue: Queue,
    ) {}

    async handle(provider: string, event: string, payload: unknown): Promise<{ received: boolean }> {
        const job: InboundWebhookJob = {
            provider,
            event,
            payload,
            receivedAt: new Date().toISOString(),
        };

        await this.executionQueue.add(`webhook:${provider}:${event}`, job);

        this.logger.log(`Enqueued webhook — provider=${provider} event=${event}`);

        return { received: true };
    }
}