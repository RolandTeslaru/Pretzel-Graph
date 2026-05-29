import { createPool, type Pool, type PoolConnection } from "mysql2/promise";
import { SqlConnectionManager } from "./sql-connection-manager";

export type MySqlCreds = {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    ssl?: boolean;
};

class MySqlConnectionManager extends SqlConnectionManager<MySqlCreds, Pool, PoolConnection> {
    protected createClient(c: MySqlCreds): Pool {
        return createPool({
            host: c.host,
            port: c.port,
            database: c.database,
            user: c.user,
            password: c.password,
            // `{}` enables TLS with default verification; works with managed MySQL
            // (PlanetScale, RDS, …) that present a publicly-trusted cert.
            ssl: c.ssl ? {} : undefined,
            connectionLimit: 4,
        });
    }
    protected disposeClient(p: Pool): Promise<void> { return p.end(); }
    protected acquire(p: Pool): Promise<PoolConnection> { return p.getConnection(); }
    // MySQL's session-state reset is COM_RESET_CONNECTION, exposed via changeUser({}) —
    // re-auths on the same socket, clearing SET vars / temp tables (the DISCARD ALL analog).
    protected async reset(conn: PoolConnection): Promise<void> { await conn.changeUser({}); }
    protected release(conn: PoolConnection): void { conn.release(); }
}

/** Process-wide singleton — shared by every MySQL loader and node in this process. */
export const mysql = new MySqlConnectionManager();

/**
 * Maps a decrypted credential record to a typed MySqlCreds. Defensive coercion keeps
 * legacy string-encoded values working alongside the type-preserving ones.
 */
export function toMySqlCreds(values: Record<string, unknown>): MySqlCreds {
    return {
        host: String(values.host ?? ""),
        port: Number(values.port),
        database: String(values.database ?? ""),
        user: String(values.user ?? ""),
        password: String(values.password ?? ""),
        ssl: values.ssl === true || values.ssl === "true",
    };
}
