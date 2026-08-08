import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { createHash } from 'crypto';
import { Principal } from '@/domain/Principal';
import { ApiKey } from '@pretzel-graph/shared/domain';
import { DB } from '@/db';

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

        const data = await DB.asUser(principal, (trx) =>
            trx
                .insertInto('api_keys')
                .values({
                    user_id: principal.userId,
                    name: req.name,
                    prefix,
                    key_hash: keyHash,
                    last_used_at: null,
                    expires_at: null,
                    revoked_at: null,
                })
                .returning([
                    'id',
                    'user_id',
                    'name',
                    'prefix',
                    'last_used_at',
                    'expires_at',
                    'revoked_at',
                    'created_at',
                ])
                .executeTakeFirstOrThrow(),
        );

        return { apiKey: ApiKey.Schema.parse(data), raw };
    }

    async list(principal: Principal.User): Promise<ApiKey.API.List.Response> {
        const data = await DB.asUser(principal, (trx) =>
            trx
                .selectFrom('api_keys')
                .select([
                    'id',
                    'user_id',
                    'name',
                    'prefix',
                    'last_used_at',
                    'expires_at',
                    'revoked_at',
                    'created_at',
                ])
                .orderBy('created_at', 'desc')
                .execute(),
        );

        return { apiKeys: data.map((row) => ApiKey.Schema.parse(row)) };
    }

    async revoke(principal: Principal.User, req: ApiKey.API.Revoke.Request): Promise<ApiKey.API.Revoke.Response> {
        await DB.asUser(principal, (trx) =>
            trx
                .updateTable('api_keys')
                .set({ revoked_at: new Date().toISOString() })
                .where('id', '=', req.id)
                .execute(),
        );

        return {};
    }
}
