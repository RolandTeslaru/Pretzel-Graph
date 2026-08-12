import { Injectable, Logger } from '@nestjs/common';
import { REDIS_HOST, REDIS_PORT } from '@pretzel-graph/shared/constants';
import { Webhook } from '@pretzel-graph/shared/domain/Webhook';
import { Consultation, Execution, Workflow } from '@pretzel-graph/shared/domain';
import Redis from 'ioredis';

interface TestRegistration {
    workflowId: Workflow.Id;
    method: Webhook.Method;
    timer: ReturnType<typeof setTimeout>;
    // Opaque forwarding address supplied at registration. This server addresses routes by
    // workflow and path; these exist only to be handed back so the answer finds its node.
    executionId?: Execution.Id;
    consultationId?: Consultation.Id;
}

@Injectable()
export class WebhookTestService {
    private readonly logger = new Logger(WebhookTestService.name);
    private readonly redisPub = new Redis({ host: REDIS_HOST, port: REDIS_PORT });
    private readonly registrations = new Map<Webhook.RouteId, TestRegistration>();

    // TTL comes from the caller: the node knows how long it is prepared to wait, and a
    // route that outlives that wait accepts payloads nothing is listening for.
    register(
        path: Webhook.Path,
        method: Webhook.Method,
        workflowId: Workflow.Id,
        timeoutMs: number,
        executionId?: Execution.Id,
        consultationId?: Consultation.Id,
    ) {
        const key = Webhook.createId(workflowId as unknown as Webhook.WorkflowId, path);

        const existing = this.registrations.get(key);
        if (existing) clearTimeout(existing.timer);

        const timer = setTimeout(() => {
            this.registrations.delete(key);
            this.logger.warn(`Test registration expired for workflow=${workflowId} path=${path}`);
        }, timeoutMs);

        this.registrations.set(key, { workflowId, method, timer, executionId, consultationId });
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

        // Answers the node's consultation on the execution's own signal channel. Both ids
        // arrived with the registration — nothing here derives them, and this server still
        // addresses routes purely by workflow and path.
        if (!reg.executionId || !reg.consultationId) {
            this.logger.warn(`Test webhook at /${reg.workflowId}/${path} has no consultation to answer — dropping payload`);
            return false;
        }

        const channel = Execution.Signal.getChannel(reg.executionId);

        const signal = Consultation.Signal.Answer.parse({
            channel,
            type:           'consultation:answer',
            executionId:    reg.executionId,
            consultationId: reg.consultationId,
            answer: {
                requestId: reg.consultationId,
                variant:   Webhook.Test.Consultation.Variant,
                payload,
            } satisfies Webhook.Test.Consultation.Answer,
        });

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
