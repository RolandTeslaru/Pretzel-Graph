import { Pool } from 'pg';

/**
 * Direct Postgres connection for the webhook server, as the service role. Replaces the
 * PostgREST (`supabase.rpc`) path so the Data API can be disabled — nothing here depends on
 * `/rest/v1` any more.
 *
 * DATABASE_URL_SERVICE logs in as the table owner, which bypasses RLS. That matches the old
 * service-role key: registry hydration needs every active publication regardless of owner.
 */
let pool: Pool | undefined;

export function db(): Pool {
    if (pool)
        return pool;

    const connectionString = process.env.DATABASE_URL_SERVICE;

    if (!connectionString)
        throw new Error('Missing DATABASE_URL_SERVICE environment variable.');

    pool = new Pool({ connectionString });
    return pool;
}

export async function closeDb(): Promise<void> {
    await pool?.end();
    pool = undefined;
}
