import { All, Controller, HttpCode, NotFoundException, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { Webhook } from '@pretzel-graph/shared/domain/Webhook';
import { ZodBody, ZodParam } from '@pretzel-graph/shared/server/pipes/zod.pipe';
import { BackendGuard } from '../../guards/backend.guard';
import { WebhookTestService } from './webhook-test.service';

@Controller('test')
export class WebhookTestController {
    constructor(private readonly testService: WebhookTestService) {}

    // Guarded per-route, not on the class: `receive` below is deliberately public —
    // it is the URL the user curls.
    @Post('register')
    @UseGuards(BackendGuard)
    @HttpCode(200)
    register(@ZodBody(Webhook.Test.API.Register.Request) body: Webhook.Test.API.Register.Request) {
        this.testService.register(body.path, body.method, body.workflowId, body.timeoutMs, body.executionId, body.consultationId);
        return { ok: true };
    }

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
