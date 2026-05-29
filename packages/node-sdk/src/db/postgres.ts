import { Pool, type PoolClient } from "pg";
import { SqlConnectionManager } from "./sql-connection-manager";

export type PostgresCreds = {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    ssl?: boolean;
};

class PostgresConnectionManager extends SqlConnectionManager<PostgresCreds, Pool, PoolClient> {
    protected createClient(c: PostgresCreds): Pool {
        return new Pool({
            host: c.host,
            port: c.port,
            database: c.database,
            user: c.user,
            password: c.password,
            // `true` = encrypt AND verify the server cert against the system trust store.
            // Works out of the box with managed Postgres (Neon, RDS, …) that present a
            // publicly-trusted cert. Self-signed / self-hosted DBs would need an ssl-mode
            // model with an explicit "allow self-signed" opt-in (see TASKS follow-up).
            ssl: c.ssl ? true : undefined,
            max: 4,
        });
    }
    protected disposeClient(p: Pool): Promise<void> { return p.end(); }
    protected acquire(p: Pool): Promise<PoolClient> { return p.connect(); }
    protected async reset(conn: PoolClient): Promise<void> { await conn.query("DISCARD ALL"); }
    protected release(conn: PoolClient): void { conn.release(); }
}

/** Process-wide singleton — shared by every Postgres loader and node in this process. */
export const postgres = new PostgresConnectionManager();

/**
 * Maps a decrypted credential record to a typed PostgresCreds. Credential values are now
 * type-preserving (Vault.DecryptedValues), so `port` arrives as a number and `ssl` as a
 * boolean — but we stay defensive and coerce, so legacy string-encoded values still work.
 */
export function toPgCreds(values: Record<string, unknown>): PostgresCreds {
    return {
        host: String(values.host ?? ""),
        port: Number(values.port),
        database: String(values.database ?? ""),
        user: String(values.user ?? ""),
        password: String(values.password ?? ""),
        ssl: values.ssl === true || values.ssl === "true",
    };
}
