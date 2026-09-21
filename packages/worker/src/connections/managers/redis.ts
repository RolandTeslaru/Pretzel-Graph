import Redis from "ioredis";
import type { RedisCreds } from "@pretzel-graph/node-sdk";
import { ConnectionManager } from "./connection-manager";

export class RedisConnectionManager extends ConnectionManager<RedisCreds, Redis> {
    protected createClient(creds: RedisCreds): Redis {
        const client = new Redis({
            host: creds.host,
            port: creds.port,
            username: creds.username || undefined,
            password: creds.password || undefined,
            db: creds.db ?? 0,
            tls: creds.tls ? {} : undefined,
            maxRetriesPerRequest: 1,
        });

        client.on("error", () => {});

        return client;
    }

    protected disposeClient(client: Redis): void { client.disconnect(); }
}
