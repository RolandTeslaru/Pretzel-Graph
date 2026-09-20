import { Injectable, OnApplicationShutdown } from "@nestjs/common";
import type { Pool as PostgresPool, PoolClient as PostgresConnection } from "pg";
import type { Pool as MySqlPool, PoolConnection as MySqlConnection } from "mysql2/promise";
import Redis from "ioredis";
import type { MongoClient } from "mongodb";
import { Client as McpClient } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type {
    ConnectionAPI,
    McpCreds,
    MongoCreds,
    MySqlCreds,
    PostgresCreds,
    RedisCreds,
} from "@pretzel-graph/node-sdk";
import { bounded } from "../utils";
import { ConnectionManager, SqlConnectionManager } from "./connection-manager";

const PURGE_TIMEOUT_MS = 3_000;

class PostgresConnectionManager extends SqlConnectionManager<PostgresCreds, PostgresPool, PostgresConnection> {
    protected async createClient(creds: PostgresCreds): Promise<PostgresPool> {
        const { Pool } = await import("pg");

        return new Pool({
            ...creds,
            ssl: creds.ssl ? true : undefined,
            max: 4,
        });
    }

    protected disposeClient(pool: PostgresPool): Promise<void> { return pool.end(); }
    protected override isIdle(pool: PostgresPool): boolean { return pool.totalCount === pool.idleCount && pool.waitingCount === 0; }
    protected acquire(pool: PostgresPool): Promise<PostgresConnection> { return pool.connect(); }
    protected async reset(connection: PostgresConnection): Promise<void> { await connection.query("DISCARD ALL"); }
    protected release(connection: PostgresConnection): void { connection.release(); }
}

class MySqlConnectionManager extends SqlConnectionManager<MySqlCreds, MySqlPool, MySqlConnection> {
    protected async createClient(creds: MySqlCreds): Promise<MySqlPool> {
        const { createPool } = await import("mysql2/promise");

        return createPool({
            ...creds,
            ssl: creds.ssl ? {} : undefined,
            connectionLimit: 4,
        });
    }

    protected disposeClient(pool: MySqlPool): Promise<void> { return pool.end(); }
    protected acquire(pool: MySqlPool): Promise<MySqlConnection> { return pool.getConnection(); }
    protected async reset(connection: MySqlConnection): Promise<void> { await connection.changeUser({}); }
    protected release(connection: MySqlConnection): void { connection.release(); }
}

class RedisConnectionManager extends ConnectionManager<RedisCreds, Redis> {
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

class MongoConnectionManager extends ConnectionManager<MongoCreds, MongoClient> {
    protected async createClient(creds: MongoCreds): Promise<MongoClient> {
        const { MongoClient: Client } = await import("mongodb");
        const auth = `${encodeURIComponent(creds.user)}:${encodeURIComponent(creds.password)}`;
        const base = creds.port
            ? `mongodb://${auth}@${creds.host}:${creds.port}`
            : `mongodb+srv://${auth}@${creds.host}`;
        const uri = creds.tls ? `${base}/?tls=true` : base;

        return Client.connect(uri, { maxPoolSize: 4 });
    }

    protected disposeClient(client: MongoClient): Promise<void> { return client.close(); }
}

class McpConnectionManager extends ConnectionManager<McpCreds, McpClient> {
    protected async createClient(creds: McpCreds): Promise<McpClient> {
        const client = new McpClient({ name: "pretzelgraph", version: "1.0.0" });
        const transport = creds.transport === "stdio"
            ? new StdioClientTransport({
                command: creds.command,
                args: creds.args,
                env: creds.env,
                cwd: creds.cwd,
            })
            : new StreamableHTTPClientTransport(new URL(creds.url), {
                requestInit: { headers: creds.headers },
            });

        await client.connect(transport);

        return client;
    }

    protected async disposeClient(client: McpClient): Promise<void> {
        await client.close();
    }
}

// The only owner of live node connections in the worker process.
@Injectable()
export class ConnectionService implements ConnectionAPI, OnApplicationShutdown {

    public readonly postgres = new PostgresConnectionManager();
    public readonly mysql = new MySqlConnectionManager();
    public readonly redis = new RedisConnectionManager();
    public readonly mongo = new MongoConnectionManager();
    public readonly mcp = new McpConnectionManager();




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
