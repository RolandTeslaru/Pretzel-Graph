import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';

export interface WebhookRequest extends Request {
    rawBody: Buffer;
}

// Each provider sends their signature in a different header with a different format.
// Add new entries here as you integrate more providers.
const PROVIDER_CONFIGS: Record<string, { header: string; secret: string; prefix?: string }> = {
    stripe: {
        header: 'stripe-signature',
        secret: process.env.WEBHOOK_SECRET_STRIPE ?? '',
        prefix: 'v1=',
    },
    github: {
        header: 'x-hub-signature-256',
        secret: process.env.WEBHOOK_SECRET_GITHUB ?? '',
        prefix: 'sha256=',
    },
    generic: {
        header: 'x-webhook-signature',
        secret: process.env.WEBHOOK_SECRET_GENERIC ?? '',
    },
};

@Injectable()
export class HmacSignatureGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const req = context.switchToHttp().getRequest<WebhookRequest>();
        const provider = req.params['provider'] ?? 'generic';
        const config = PROVIDER_CONFIGS[provider];

        if (!config) throw new UnauthorizedException(`Unknown webhook provider: ${provider}`);
        if (!config.secret) throw new UnauthorizedException(`No secret configured for provider: ${provider}`);

        const rawSignature = req.headers[config.header] as string | undefined;
        if (!rawSignature) throw new UnauthorizedException('Missing signature header');

        const signature = config.prefix && rawSignature.startsWith(config.prefix)
            ? rawSignature.slice(config.prefix.length)
            : rawSignature;

        const expected = createHmac('sha256', config.secret)
            .update(req.rawBody)
            .digest('hex');

        const sigBuffer = Buffer.from(signature, 'hex');
        const expBuffer = Buffer.from(expected, 'hex');

        if (sigBuffer.length !== expBuffer.length || !timingSafeEqual(sigBuffer, expBuffer)) {
            throw new UnauthorizedException('Invalid signature');
        }

        return true;
    }
}
