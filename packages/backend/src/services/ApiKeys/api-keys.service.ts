import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { createHash } from 'crypto';
import { Principal } from '@/domain/Principal';
import { ApiKey, SystemError } from '@pretzel-graph/shared/domain';

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
    async create(principal: Principal.User, req: ApiKey.API.Create.Request): Promise<ApiKey.API.Create.Response> {
        const raw = generateRawKey();
        const prefix = raw.slice(0, 12);
        const keyHash = hashKey(raw);

        const { data, error } = await principal.supabase
            .from('api_keys')
            .insert({ user_id: principal.userId, name: req.name, prefix, key_hash: keyHash })
            .select('id, user_id, name, prefix, last_used_at, expires_at, revoked_at, created_at')
            .single();

        if (error || !data) throw new SystemError(SystemError.Code.INFRA_UNKNOWN, 'Failed to create API key');

        return { apiKey: ApiKey.Schema.parse(data), raw };
    }

    async list(principal: Principal.User): Promise<ApiKey.API.List.Response> {
        const { data, error } = await principal.supabase
            .from('api_keys')
            .select('id, user_id, name, prefix, last_used_at, expires_at, revoked_at, created_at')
            .order('created_at', { ascending: false });

        if (error) throw new SystemError(SystemError.Code.INFRA_UNKNOWN, 'Failed to list API keys');

        return { apiKeys: (data ?? []).map(row => ApiKey.Schema.parse(row)) };
    }

    async revoke(principal: Principal.User, req: ApiKey.API.Revoke.Request): Promise<ApiKey.API.Revoke.Response> {
        const { error } = await principal.supabase
            .from('api_keys')
            .update({ revoked_at: new Date().toISOString() })
            .eq('id', req.id);

        if (error) throw new SystemError(SystemError.Code.INFRA_UNKNOWN, 'Failed to revoke API key');

        return {};
    }
}
