import { All, Controller, HttpCode, Param, Req } from '@nestjs/common';
import { Request } from 'express';
import { Webhook } from '@pretzel-graph/shared/domain/Webhook';
import { IgniterService } from './igniter.service';

@Controller()
export class IgniterController {
    constructor(private readonly igniterService: IgniterService) {}

    @All(':workflowId/:path')
    // Accepted for processing — the execution runs after this returns.
    @HttpCode(202)
    async receive(
        @Param('workflowId') workflowId: string,
        @Param('path') path: string,
        @Req() req: Request,
    ) {
        return this.igniterService.handle({
            workflowId: workflowId as Webhook.WorkflowId,
            method: Webhook.Method.parse(req.method),
            path: path as Webhook.Path,
            headers: req.headers as Record<string, unknown>,
            query: req.query as Record<string, unknown>,
            body: req.body,
        });
    }
}
