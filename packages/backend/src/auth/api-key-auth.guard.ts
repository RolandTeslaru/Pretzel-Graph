import { CanActivate, ExecutionContext as NestExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { createHash } from 'crypto';
import { Auth, ApiKey } from '@pretzel-graph/shared/domain';
import { DB } from '@/db';

export interface ApiKeyAuthenticatedRequest extends Request {
    user: {
        id: Auth.User.Id;
    };
    apiKey: {
        id: ApiKey.Id;
    };
}

// SHA-256 is correct here: API keys have 190+ bits of entropy so rainbow tables
// are irrelevant, and deterministic hashing is required for the DB lookup.
function hashKey(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
}

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
    async canActivate(context: NestExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<ApiKeyAuthenticatedRequest>();
        const raw = this.extractBearerToken(request);

        if (!raw) throw new UnauthorizedException('No API key provided');

        const parsed = ApiKey.Raw.safeParse(raw);
        if (!parsed.success) throw new UnauthorizedException('Malformed API key');

        const keyHash = hashKey(parsed.data);

        const row = await DB.asService('authenticate API key', (db) =>
            db
                .selectFrom('api_keys')
                .select(['id', 'user_id'])
                .where('key_hash', '=', keyHash)
                .where('revoked_at', 'is', null)
                .where((eb) => eb.or([
                    eb('expires_at', 'is', null),
                    eb('expires_at', '>', new Date().toISOString()),
                ]))
                .executeTakeFirst(),
        );

        if (!row) throw new UnauthorizedException('Invalid or expired API key');

        request.user   = { id: row.user_id };
        request.apiKey = { id: row.id };

        // fire-and-forget: best-effort last_used_at update
        void DB.asService('record API key use', (db) =>
            db
                .updateTable('api_keys')
                .set({ last_used_at: new Date().toISOString() })
                .where('id', '=', row.id)
                .execute(),
        );

        return true;
    }

    private extractBearerToken(request: Request): string | undefined {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' && token ? token : undefined;
    }
}
