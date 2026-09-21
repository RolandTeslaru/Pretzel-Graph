import type { Pool as MySqlPool, PoolConnection as MySqlConnection } from "mysql2/promise";
import type { MySqlCreds } from "@pretzel-graph/node-sdk";
import { SqlConnectionManager } from "./connection-manager";

export class MySqlConnectionManager extends SqlConnectionManager<MySqlCreds, MySqlPool, MySqlConnection> {
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
