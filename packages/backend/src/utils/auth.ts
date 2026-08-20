import { importJWK, jwtVerify } from 'jose';
import { GoTrueClient } from '@supabase/auth-js';
import { Auth } from '@pretzel-graph/shared/domain';

/** What a verified access token tells us about its subject. */
export type VerifiedToken = {
    raw: string;
    userId: Auth.User.Id;
    email: string | null;
    username: string | null;
    displayName: string | null;
};

const ALGORITHM = 'HS256';
const AUDIENCE = 'authenticated';

let secret: Uint8Array | undefined;

function getSecret(): Uint8Array {
    if (secret)
        return secret;

    const value = process.env.AUTH_JWT_SECRET;

    if (!value)
        throw new Error('AUTH_JWT_SECRET is not set');

    return (secret = new TextEncoder().encode(value));
}

// When set, tokens must be issued for this deployment specifically and are
// verified against this public key. The shared-secret path is then disabled —
// accepting both would let a caller pick whichever check it can pass.
const SCOPED_ALGORITHM = 'ES256';

let scopedKey: Promise<Awaited<ReturnType<typeof importJWK>>> | undefined;

function getScopedKey(): Promise<Awaited<ReturnType<typeof importJWK>>> {
    return (scopedKey ??= importJWK(JSON.parse(process.env.WORKSPACE_TOKEN_PUBLIC_KEY!), SCOPED_ALGORITHM));
}

function requireScopedEnv(name: 'WORKSPACE_ID' | 'TOKEN_ISSUER'): string {
    const value = process.env[name];

    if (!value)
        throw new Error(`WORKSPACE_TOKEN_PUBLIC_KEY is set but ${name} is not`);

    return value;
}

const asString = (value: unknown): string | null =>
    typeof value === 'string' && value.length > 0 ? value : null;

/**
 * Checks the signature and claims locally. Returns null when the token is not
 * genuine, expired, or not meant for us; throws only when we are misconfigured.
 */
export async function verifyToken(token: string): Promise<VerifiedToken | null> {
    if (process.env.WORKSPACE_TOKEN_PUBLIC_KEY)
        return verifyScopedToken(token);

    const key = getSecret();

    try {
        // Algorithm pinned: without it a token could name its own, and `none`
        // would skip the signature entirely.
        const { payload } = await jwtVerify(token, key, {
            algorithms: [ALGORITHM],
            audience: AUDIENCE,
        });

        const parsed = Auth.User.Id.safeParse(payload.sub);

        if (!parsed.success)
            return null;

        const metadata = (payload.user_metadata ?? {}) as Record<string, unknown>;

        return {
            raw: token,
            userId: parsed.data,
            email: asString(payload.email),
            username: asString(metadata.username),
            displayName: asString(metadata.display_name),
        };
    }
    catch {
        return null;
    }
}

/**
 * A token addressed to this deployment. The audience check is what rejects a
 * token minted for a different one, so it is the one check that must not relax.
 */
async function verifyScopedToken(token: string): Promise<VerifiedToken | null> {
    const audience = `workspace:${requireScopedEnv('WORKSPACE_ID')}`;
    const issuer = requireScopedEnv('TOKEN_ISSUER');

    const key = await getScopedKey();

    try {
        const { payload } = await jwtVerify(token, key, {
            algorithms: [SCOPED_ALGORITHM],
            audience,
            issuer,
        });

        const parsed = Auth.User.Id.safeParse(payload.sub);

        if (!parsed.success)
            return null;

        // Identity only: the profile is in this deployment's own users table.
        return {
            raw: token,
            userId: parsed.data,
            email: null,
            username: null,
            displayName: null,
        };
    }
    catch {
        return null;
    }
}

let issuer: GoTrueClient | undefined;

/**
 * Asks the issuer whether the subject still exists. Reserved for decisions that
 * a signature alone should not settle — a token outlives the account it names.
 */
export async function subjectExistsAtIssuer(token: VerifiedToken): Promise<boolean> {
    const url = process.env.AUTH_URL;

    if (!url)
        return false;

    issuer ??= new GoTrueClient({ url, persistSession: false, autoRefreshToken: false });

    const { data, error } = await issuer.getUser(token.raw);

    return !error && data.user?.id === token.userId;
}
