import { All, Controller, Param, Req } from '@nestjs/common';
import { Request } from 'express';
import { Webhook } from '@pretzel-graph/shared/domain/Foundations/Webhook';
import { WebhookIgniterService } from './webhook-igniter.service';

@Controller()
export class WebhookIgniterController {
    constructor(private readonly igniterService: WebhookIgniterService) {}

    // Handles any HTTP method on /webhooks/:path — method is validated
    // against the registered webhook in the service layer.
    @All(':path')
    async receive(
        @Param('path') path: string,
        @Req() req: Request,
    ) {
        return this.igniterService.handle({
            method: Webhook.Method.parse(req.method),
            path: path as Webhook.Path,
            headers: req.headers as Record<string, unknown>,
            query: req.query as Record<string, unknown>,
            body: req.body,
        });
    }
}
