import { Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { RuntimeNodeAuthGuard } from '@/auth/runtime-node-auth.guard';
import { Webhook } from '@pretzel-graph/shared/domain/Webhook';
import { ZodBody } from '@/pipes/zod.pipe';
import axios from 'axios';

// Proxy for worker → webhook server registration.
// The worker only knows the backend URL (API_URL), so it registers here
// and we forward to the webhook server via WEBHOOK_SERVER_URL.
@Controller('webhook/test')
@UseGuards(RuntimeNodeAuthGuard)
export class WebhookTestController {

    private get webhookServerUrl() {
        return process.env.WEBHOOK_SERVER_URL ?? 'http://localhost:3002';
    }

    @Post('register')
    @HttpCode(200)
    async register(
        @ZodBody(Webhook.Test.API.Register.Request) body: Webhook.Test.API.Register.Request,
    ) {
        await axios.post(`${this.webhookServerUrl}/webhooks/test/register`, body);
        return { ok: true };
    }
}
