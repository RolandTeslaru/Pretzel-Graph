import Redis from "ioredis";
import { ConnectionManager } from "./connection-manager";

export type RedisCreds = {
    host: string;
    port: number;
    password?: string;
    db?: number;
};

class RedisConnectionManager extends ConnectionManager<RedisCreds, Redis> {
    protected createClient(c: RedisCreds): Redis {
        const client = new Redis({
            host: c.host,
            port: c.port,
            password: c.password || undefined,
            db: c.db ?? 0,
            maxRetriesPerRequest: 1,
        });
        // Swallow connection-level error events so a bad host doesn't crash the process —
        // the per-command promise still rejects, so callers (loaders / onRun) see the error.
        client.on("error", () => {});
        return client;
    }
    protected disposeClient(client: Redis): void { client.disconnect(); }
}

/** Process-wide singleton — the ioredis client manages its own connection internally. */
export const redis = new RedisConnectionManager();

/**
 * Maps a decrypted credential record to a typed RedisCreds. Defensive coercion keeps
 * legacy string-encoded values working alongside the type-preserving ones.
 */
export function toRedisCreds(values: Record<string, unknown>): RedisCreds {
    return {
        host: String(values.host ?? ""),
        port: Number(values.port),
        password: values.password ? String(values.password) : undefined,
        db: Number(values.db ?? 0),
    };
}
