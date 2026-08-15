import { GoTrueClient } from '@supabase/auth-js';
import { Auth } from '@pretzel-graph/shared/domain';

const url = process.env.AUTH_URL || '';

if (!url)
    console.warn('Missing AUTH_URL environment variable.');

const client = new GoTrueClient({ url, persistSession: false, autoRefreshToken: false });

/** Resolves the subject of `token`, or null if the issuer rejects it. */
export async function getUserId(token: string): Promise<Auth.User.Id | null> {
    const { data, error } = await client.getUser(token);

    if (error)
        return null;

    return (data.user?.id as Auth.User.Id) ?? null;
}
