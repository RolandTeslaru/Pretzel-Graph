import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard } from '@/auth/supabase-auth.guard';
import { Webhook } from '@pretzel-graph/shared/domain/Foundations/Webhook';
import axios from 'axios';

@Controller('api/webhook/test')
export class WebhookTestController {

    private get webhookServerUrl() {
        return process.env.WEBHOOK_SERVER_URL ?? 'http://localhost:3002';
    }

    @Post('register')
    @HttpCode(200)
    @UseGuards(SupabaseAuthGuard)
    async register(@Body() body: unknown) {
        const payload = Webhook.Test.API.Register.Request.parse(body);
        await axios.post(`${this.webhookServerUrl}/webhooks/test/register`, payload);
        return { ok: true };
    }
}
