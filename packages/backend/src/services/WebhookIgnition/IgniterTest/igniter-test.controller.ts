import { All, Controller, NotFoundException, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { Webhook } from '@pretzel-graph/shared/domain/Webhook';
import { ZodParam } from '@pretzel-graph/shared/server/pipes/zod.pipe';
import { IgniterTestService } from './igniter-test.service';

// Public on purpose: this is the URL the user curls. Registrations are in-memory
// and expire, so an unregistered path is a 404.
@Controller('webhook-test')
@Throttle({ default: { limit: 300, ttl: 60000 } })
export class IgniterTestController {
    constructor(private readonly testService: IgniterTestService) {}

    @All(':workflowId/:path')
    async receive(
        @ZodParam('workflowId', Webhook.WorkflowId) workflowId: Webhook.WorkflowId,
        @ZodParam('path', Webhook.Path) path: Webhook.Path,
        @Req() req: Request,
    ) {
        const payload: Webhook.Payload = {
            // Off the raw request rather than a route param, so it stays a manual parse.
            method: Webhook.Method.parse(req.method),
            path,
            headers: req.headers as Record<string, unknown>,
            query: req.query as Record<string, unknown>,
            body: req.body,
        };

        const dispatched = await this.testService.dispatch(workflowId, path, payload);
        if (!dispatched) throw new NotFoundException(`No active test webhook registered at /${workflowId}/${path}`);

        return { ok: true };
    }
}
