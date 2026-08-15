import { jwtVerify } from 'jose';
import { Auth } from '@pretzel-graph/shared/domain';

/** What a verified access token tells us about its subject. */
export type VerifiedToken = {
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

const asString = (value: unknown): string | null =>
    typeof value === 'string' && value.length > 0 ? value : null;

/**
 * Checks the signature and claims locally. Returns null when the token is not
 * genuine, expired, or not meant for us; throws only when we are misconfigured.
 */
export async function verifyToken(token: string): Promise<VerifiedToken | null> {
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
