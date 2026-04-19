import { CanActivate, ExecutionContext as NestExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { Token } from '@/domain/Token';
import dotenv from 'dotenv';

dotenv.config();

export interface InternalAuthenticatedRequest extends Request {
    internal: {
        service: string;
        token: Token.InternalService;
    };
}

const INTERNAL_TOKEN_SUFFIX = '_SERVICE_INTERNAL_TOKEN';

function getConfiguredInternalTokens(): Map<Token.InternalService, string> {
    const entries = Object.entries(process.env)
        .filter(([key, value]) => key.endsWith(INTERNAL_TOKEN_SUFFIX) && typeof value === 'string' && value.length > 0);

    const tokenMap = new Map<Token.InternalService, string>();

    for (const [key, value] of entries) {
        const rawService = key.slice(0, -INTERNAL_TOKEN_SUFFIX.length);
        const service = rawService.toLowerCase();
        const parsedToken = Token.InternalService.safeParse(value);

        if (parsedToken.success)
            tokenMap.set(parsedToken.data, service);
    }

    return tokenMap;
}

function extractServiceToken(request: Request): Token.InternalService | undefined {
    const value = request.headers['internal-service-token'];
    const token = typeof value === 'string' ? value : undefined;

    if (!token)
        return undefined;

    const parsed = Token.InternalService.safeParse(token);
    return parsed.success ? parsed.data : undefined;
}

@Injectable()
export class InternalAuthGuard implements CanActivate {
    async canActivate(context: NestExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<InternalAuthenticatedRequest>();
        const token = extractServiceToken(request);

        if (!token)
            throw new UnauthorizedException('Missing internal service token');

        const configuredTokens = getConfiguredInternalTokens();

        if (configuredTokens.size === 0)
            throw new UnauthorizedException('Internal auth not configured');

        const service = configuredTokens.get(token);

        if (!service)
            throw new UnauthorizedException('Invalid internal service token');

        request.internal = { service, token };

        return true;
    }
}
