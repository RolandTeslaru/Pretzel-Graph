import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { timingSafeEqual } from 'crypto';
import { Webhook } from '@pretzel-graph/shared/domain/Webhook';

/**
 * Admits only the backend. This server is internet-facing — it exists to receive
 * third-party webhooks — so its control routes sit on the same surface as the
 * inbound ones and need a caller check.
 *
 * A shared secret rather than a signature: the only holder is the backend, and a
 * secret held by a trusted party needs no per-request scoping. Contrast
 * Execution.Token, which travels to the worker and is therefore signed.
 */
@Injectable()
export class BackendGuard implements CanActivate {

    canActivate(context: ExecutionContext): boolean {
        const expected = process.env.BACKEND_TO_WEBHOOK_TOKEN;

        // Deny by default. An unset secret must not mean "let everyone in".
        if (!expected)
            throw new UnauthorizedException('Backend auth not configured');

        const request = context.switchToHttp().getRequest<Request>();
        const value = request.headers[Webhook.BACKEND_TOKEN_HEADER];

        if (typeof value !== 'string')
            throw new UnauthorizedException('Missing backend service token');

        if (!this.matches(value, expected))
            throw new UnauthorizedException('Invalid backend service token');

        return true;
    }

    // timingSafeEqual throws on a length mismatch, so compare lengths first —
    // and length is not the secret.
    private matches(received: string, expected: string): boolean {
        const a = Buffer.from(received);
        const b = Buffer.from(expected);

        if (a.length !== b.length)
            return false;

        return timingSafeEqual(a, b);
    }
}
