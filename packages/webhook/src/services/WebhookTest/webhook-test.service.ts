import { Injectable, Logger } from '@nestjs/common';
import { REDIS_HOST, REDIS_PORT } from '@pretzel-graph/shared/constants';
import { Webhook } from '@pretzel-graph/shared/domain/Webhook';
import { Workflow } from '@pretzel-graph/shared/domain';
import Redis from 'ioredis';

const REGISTRATION_TTL_MS = 150_000; // 2 min 30 s

interface TestRegistration {
    workflowId: Workflow.Id;
    method: Webhook.Method;
    timer: ReturnType<typeof setTimeout>;
}

@Injectable()
export class WebhookTestService {
    private readonly logger = new Logger(WebhookTestService.name);
    private readonly redisPub = new Redis({ host: REDIS_HOST, port: REDIS_PORT });
    private readonly registrations = new Map<Webhook.Path, TestRegistration>();

    register(
        path:       Webhook.Path, 
        method:     Webhook.Method,
        workflowId: Workflow.Id
    ) {
        this.deregister(workflowId);

        const timer = setTimeout(() => {
            this.registrations.delete(path);
            this.logger.warn(`Test registration expired for path=${path} workflow=${workflowId}`);
        }, REGISTRATION_TTL_MS);

        this.registrations.set(path, { workflowId, method, timer });
        this.logger.log(`Registered test webhook [${method}] /${path} → workflow=${workflowId}`);
    }

    deregister(
        workflowId: Workflow.Id
    ) {
        for (const [path, reg] of this.registrations) {
            if (reg.workflowId === workflowId) {
                clearTimeout(reg.timer);
                this.registrations.delete(path);
            }
        }
    }

    async dispatch(
        path: Webhook.Path, 
        payload: Webhook.Payload
    ): Promise<boolean> {
        const reg = this.registrations.get(path);
        if (!reg) return false;

        const channel = Webhook.Test.Signal.getChannel(reg.workflowId);

        const signal: Webhook.Test.Signal.Resolve = {
            type: "resolve",
            channel,
            workflowId: reg.workflowId,
            payload,
        };

        await this.redisPub.publish(channel, JSON.stringify(signal));

        this.deregister(reg.workflowId);
        this.logger.log(`Dispatched test webhook for workflow=${reg.workflowId} on channel=${channel}`);
        return true;
    }

    onModuleDestroy() {
        for (const reg of this.registrations.values()) clearTimeout(reg.timer);
        this.redisPub.disconnect();
    }
}
