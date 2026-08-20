"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqlConnectionManager = void 0;
const connection_manager_1 = require("./connection-manager");
/**
 * Connection manager for raw-socket SQL databases (Postgres, later MySQL) where physical
 * connections are handed between borrowers and carry sticky session state (SET, temp tables,
 * open transactions). `withConnection` is the borrow → use → reset → release seam: the reset
 * (DISCARD ALL / RESET) wipes session state before the connection returns to the pool, so one
 * caller's mutations never bleed into the next.
 */
class SqlConnectionManager extends connection_manager_1.ConnectionManager {
    async withConnection(creds, fn) {
        const pool = await this.get(creds);
        const conn = await this.acquire(pool);
        try {
            return await fn(conn);
        }
        finally {
            await this.reset(conn);
            this.release(conn);
        }
    }
}
exports.SqlConnectionManager = SqlConnectionManager;
