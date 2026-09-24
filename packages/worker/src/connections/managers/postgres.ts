import type { Pool as PostgresPool, PoolClient as PostgresConnection } from "pg";
import type { PostgresCreds } from "@pretzel-graph/node-sdk";
import { SqlConnectionManager } from "./connection-manager";

export class PostgresConnectionManager extends SqlConnectionManager<PostgresCreds, PostgresPool, PostgresConnection> {
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
