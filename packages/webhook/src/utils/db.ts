import { Pool } from 'pg';

/** Direct Postgres connection for the webhook server. */
let pool: Pool | undefined;

export function db(): Pool {
    if (pool)
        return pool;

    const connectionString = process.env.DATABASE_URL;

    if (!connectionString)
        throw new Error('Missing DATABASE_URL environment variable.');

    pool = new Pool({ connectionString });
    return pool;
}

export async function closeDb(): Promise<void> {
    await pool?.end();
    pool = undefined;
}
