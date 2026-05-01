import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { createHash } from 'crypto';
import { createAuthenticatedClient, createServiceClient } from '../../utils/supabase';
import { ApiKey, Auth, SystemError } from '@pretzel-graph/shared/domain';
import { Token } from '@/domain/Token';

function generateRawKey(): ApiKey.Raw {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const bytes = randomBytes(32);
    let suffix = '';
    for (const byte of bytes) {
        suffix += chars[byte % chars.length];
    }
    return `pg_live_${suffix}` as ApiKey.Raw;
}

function hashKey(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
}

@Injectable()
export class ApiKeysService {
    async create(token: Token.UserSupabaseJWT, userId: Auth.User.Id, req: ApiKey.API.Create.Request): Promise<ApiKey.API.Create.Response> {
        const raw = generateRawKey();
        const prefix = raw.slice(0, 12);
        const keyHash = hashKey(raw);

        const supabase = createAuthenticatedClient(token);
        const { data, error } = await supabase
            .from('api_keys')
            .insert({ user_id: userId, name: req.name, prefix, key_hash: keyHash })
            .select('id, user_id, name, prefix, last_used_at, expires_at, revoked_at, created_at')
            .single();

        if (error || !data) throw new SystemError(SystemError.Code.INFRA_UNKNOWN, 'Failed to create API key');

        return { apiKey: ApiKey.Schema.parse(data), raw };
    }

    async list(token: Token.UserSupabaseJWT): Promise<ApiKey.API.List.Response> {
        const supabase = createAuthenticatedClient(token);
        const { data, error } = await supabase
            .from('api_keys')
            .select('id, user_id, name, prefix, last_used_at, expires_at, revoked_at, created_at')
            .order('created_at', { ascending: false });

        if (error) throw new SystemError(SystemError.Code.INFRA_UNKNOWN, 'Failed to list API keys');

        return { apiKeys: (data ?? []).map(row => ApiKey.Schema.parse(row)) };
    }

    async revoke(token: Token.UserSupabaseJWT, req: ApiKey.API.Revoke.Request): Promise<ApiKey.API.Revoke.Response> {
        const supabase = createAuthenticatedClient(token);
        const { error } = await supabase
            .from('api_keys')
            .update({ revoked_at: new Date().toISOString() })
            .eq('id', req.id);

        if (error) throw new SystemError(SystemError.Code.INFRA_UNKNOWN, 'Failed to revoke API key');

        return {};
    }
}
