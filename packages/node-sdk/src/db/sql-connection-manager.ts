import { ConnectionManager } from "./connection-manager";

/**
 * Connection manager for raw-socket SQL databases (Postgres, later MySQL) where physical
 * connections are handed between borrowers and carry sticky session state (SET, temp tables,
 * open transactions). `withConnection` is the borrow → use → reset → release seam: the reset
 * (DISCARD ALL / RESET) wipes session state before the connection returns to the pool, so one
 * caller's mutations never bleed into the next.
 */
export abstract class SqlConnectionManager<TCreds, TPool, TConn>
    extends ConnectionManager<TCreds, TPool> {

    /** Borrow one connection from the pool. */
    protected abstract acquire(pool: TPool): Promise<TConn>;
    /** Wipe session state before the connection is returned (DISCARD ALL / RESET). */
    protected abstract reset(conn: TConn): Promise<void>;
    /** Return the connection to the pool. */
    protected abstract release(conn: TConn): void;

    async withConnection<T>(creds: TCreds, fn: (conn: TConn) => Promise<T>): Promise<T> {
        const pool = await this.get(creds);
        const conn = await this.acquire(pool);
        try {
            return await fn(conn);
        } finally {
            await this.reset(conn);
            this.release(conn);
        }
    }
}
