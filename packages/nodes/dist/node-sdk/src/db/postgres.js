"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postgres = void 0;
exports.toPgCreds = toPgCreds;
const pg_1 = require("pg");
const sql_connection_manager_1 = require("./sql-connection-manager");
class PostgresConnectionManager extends sql_connection_manager_1.SqlConnectionManager {
    createClient(c) {
        return new pg_1.Pool({
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
    disposeClient(p) { return p.end(); }
    acquire(p) { return p.connect(); }
    async reset(conn) { await conn.query("DISCARD ALL"); }
    release(conn) { conn.release(); }
}
/** Process-wide singleton — shared by every Postgres loader and node in this process. */
exports.postgres = new PostgresConnectionManager();
/**
 * Maps a decrypted credential record to a typed PostgresCreds. Credential values are now
 * type-preserving (Vault.DecryptedValues), so `port` arrives as a number and `ssl` as a
 * boolean — but we stay defensive and coerce, so legacy string-encoded values still work.
 */
function toPgCreds(values) {
    return {
        host: String(values.host ?? ""),
        port: Number(values.port),
        database: String(values.database ?? ""),
        user: String(values.user ?? ""),
        password: String(values.password ?? ""),
        ssl: values.ssl === true || values.ssl === "true",
    };
}
