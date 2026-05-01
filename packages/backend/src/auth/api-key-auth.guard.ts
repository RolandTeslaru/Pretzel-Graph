import { CanActivate, ExecutionContext as NestExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { createHash } from 'crypto';
import { createServiceClient } from '../utils/supabase';
import { Auth, ApiKey } from '@pretzel-graph/shared/domain';

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

        const supabase = createServiceClient();
        const { data: row } = await supabase
            .from('api_keys')
            .select('id, user_id')
            .eq('key_hash', keyHash)
            .is('revoked_at', null)
            .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
            .single();

        if (!row) throw new UnauthorizedException('Invalid or expired API key');

        request.user   = { id: row.user_id as Auth.User.Id };
        request.apiKey = { id: row.id as ApiKey.Id };

        // fire-and-forget: best-effort last_used_at update
        supabase.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', row.id);

        return true;
    }

    private extractBearerToken(request: Request): string | undefined {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' && token ? token : undefined;
    }
}
