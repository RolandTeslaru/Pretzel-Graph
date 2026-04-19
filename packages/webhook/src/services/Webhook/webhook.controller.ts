import { Controller, Post, Param, Req, UseGuards, HttpCode } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { HmacSignatureGuard, WebhookRequest } from '@/guards/hmac-signature.guard';

@Controller()
export class WebhookController {
    constructor(private readonly webhookService: WebhookService) {}

    // POST /webhooks/:provider
    // The :provider param drives both signature verification and downstream routing.
    // e.g. POST /webhooks/stripe, POST /webhooks/github
    @Post(':provider')
    @UseGuards(HmacSignatureGuard)
    @HttpCode(200)
    async receive(
        @Param('provider') provider: string,
        @Req() req: WebhookRequest,
    ) {
        const event = (req.headers['x-webhook-event'] as string | undefined) ?? 'unknown';
        return this.webhookService.handle(provider, event, req.body);
    }
}
