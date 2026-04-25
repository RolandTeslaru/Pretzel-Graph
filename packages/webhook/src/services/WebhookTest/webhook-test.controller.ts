import { All, Body, Controller, HttpCode, NotFoundException, Post, Param, Req } from '@nestjs/common';
import { Request } from 'express';
import { Webhook } from '@pretzel-graph/shared/domain/Webhook';
import { WebhookTestService } from './webhook-test.service';

@Controller('test')
export class WebhookTestController {
    constructor(private readonly testService: WebhookTestService) {}

    @Post('register')
    @HttpCode(200)
    register(@Body() body: unknown) {
        const { workflowId, path, method } = Webhook.Test.API.Register.Request.parse(body);
        this.testService.register(path, method, workflowId);
        return { ok: true };
    }

    @All(':workflowId/:path')
    async receive(
        @Param('workflowId') workflowId: string,
        @Param('path') path: string,
        @Req() req: Request,
    ) {
        const payload: Webhook.Payload = {
            method: Webhook.Method.parse(req.method),
            path: Webhook.Path.parse(path),
            headers: req.headers as Record<string, unknown>,
            query: req.query as Record<string, unknown>,
            body: req.body,
        };

        const dispatched = await this.testService.dispatch(workflowId as Webhook.WorkflowId, Webhook.Path.parse(path), payload);
        if (!dispatched) throw new NotFoundException(`No active test webhook registered at /${workflowId}/${path}`);

        return { ok: true };
    }
}
