import { Injectable, OnApplicationShutdown } from "@nestjs/common";
import type { ConnectionAPI } from "@pretzel-graph/node-sdk";
import { bounded } from "../utils";
import {
    McpConnectionManager,
    MongoConnectionManager,
    MySqlConnectionManager,
    PostgresConnectionManager,
    RedisConnectionManager,
} from "./managers";

const PURGE_TIMEOUT_MS = 3_000;

// The only owner of live node connections in the worker process.
@Injectable()
export class ConnectionService implements ConnectionAPI, OnApplicationShutdown {

    public readonly postgres = new PostgresConnectionManager();
    public readonly mysql    = new MySqlConnectionManager();
    public readonly redis    = new RedisConnectionManager();
    public readonly mongo    = new MongoConnectionManager();
    public readonly mcp      = new McpConnectionManager();




    public async purgeAll(): Promise<void> {
        await Promise.allSettled([
            this.postgres.purge(),
            this.mysql.purge(),
            this.redis.purge(),
            this.mongo.purge(),
            this.mcp.purge(),
        ]);
    }




    public async onApplicationShutdown(): Promise<void> {
        await bounded(this.purgeAll(), PURGE_TIMEOUT_MS);
    }
}
