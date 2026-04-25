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
    private readonly registrations = new Map<Webhook.RouteId, TestRegistration>();

    register(path: Webhook.Path, method: Webhook.Method, workflowId: Workflow.Id) {
        const key = Webhook.createId(workflowId as unknown as Webhook.WorkflowId, path);

        const existing = this.registrations.get(key);
        if (existing) clearTimeout(existing.timer);

        const timer = setTimeout(() => {
            this.registrations.delete(key);
            this.logger.warn(`Test registration expired for workflow=${workflowId} path=${path}`);
        }, REGISTRATION_TTL_MS);

        this.registrations.set(key, { workflowId, method, timer });
        this.logger.log(`Registered test webhook [${method}] /${workflowId}/${path}`);
    }

    deregister(workflowId: Workflow.Id, path: Webhook.Path) {
        const key = Webhook.createId(workflowId as unknown as Webhook.WorkflowId, path);
        const reg = this.registrations.get(key);
        if (!reg) return;
        clearTimeout(reg.timer);
        this.registrations.delete(key);
    }

    async dispatch(
        workflowId: Webhook.WorkflowId,
        path: Webhook.Path,
        payload: Webhook.Payload,
    ): Promise<boolean> {
        const key = Webhook.createId(workflowId, path);
        const reg = this.registrations.get(key);
        if (!reg) return false;

        const channel = Webhook.Test.Signal.getChannel(reg.workflowId);
        const signal: Webhook.Test.Signal.Resolve = {
            type: "resolve",
            channel,
            workflowId: reg.workflowId,
            payload,
        };

        await this.redisPub.publish(channel, JSON.stringify(signal));
        this.deregister(reg.workflowId, path);
        this.logger.log(`Dispatched test webhook for workflow=${reg.workflowId} path=${path}`);
        return true;
    }

    onModuleDestroy() {
        for (const reg of this.registrations.values()) clearTimeout(reg.timer);
        this.redisPub.disconnect();
    }
}
