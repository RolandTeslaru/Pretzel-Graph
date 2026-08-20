"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mysql = void 0;
exports.toMySqlCreds = toMySqlCreds;
const promise_1 = require("mysql2/promise");
const sql_connection_manager_1 = require("./sql-connection-manager");
class MySqlConnectionManager extends sql_connection_manager_1.SqlConnectionManager {
    createClient(c) {
        return (0, promise_1.createPool)({
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
    disposeClient(p) { return p.end(); }
    acquire(p) { return p.getConnection(); }
    // MySQL's session-state reset is COM_RESET_CONNECTION, exposed via changeUser({}) —
    // re-auths on the same socket, clearing SET vars / temp tables (the DISCARD ALL analog).
    async reset(conn) { await conn.changeUser({}); }
    release(conn) { conn.release(); }
}
/** Process-wide singleton — shared by every MySQL loader and node in this process. */
exports.mysql = new MySqlConnectionManager();
/**
 * Maps a decrypted credential record to a typed MySqlCreds. Defensive coercion keeps
 * legacy string-encoded values working alongside the type-preserving ones.
 */
function toMySqlCreds(values) {
    return {
        host: String(values.host ?? ""),
        port: Number(values.port),
        database: String(values.database ?? ""),
        user: String(values.user ?? ""),
        password: String(values.password ?? ""),
        ssl: values.ssl === true || values.ssl === "true",
    };
}
