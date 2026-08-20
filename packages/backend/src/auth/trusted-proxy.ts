import type { RequestHandler } from 'express';
import type { IncomingHttpHeaders } from 'http';

export const TRUSTED_PROXY_HEADER = 'x-trusted-proxy-token';

const INTERNAL_TOKEN_SUFFIX = '_SERVICE_INTERNAL_TOKEN';

// Health stays open: platform checks reach it directly, and it reveals nothing.
const OPEN_PATHS = new Set(['/health', '/api/health']);

/** True when no proxy is required, or the request carries its stamp. */
export function isFromTrustedProxy(headers: IncomingHttpHeaders): boolean {
    const required = process.env.TRUSTED_PROXY_TOKEN;

    if (!required)
        return true;

    return headers[TRUSTED_PROXY_HEADER] === required;
}

// Services calling each other do not pass the proxy and carry their own token.
function isInternalService(headers: IncomingHttpHeaders): boolean {
    const value = headers['internal-service-token'];

    if (typeof value !== 'string' || value.length === 0)
        return false;

    return Object.entries(process.env).some(([key, configured]) =>
        key.endsWith(INTERNAL_TOKEN_SUFFIX) && configured === value);
}

/**
 * When TRUSTED_PROXY_TOKEN is set, only traffic stamped by the fronting proxy
 * is accepted. Left unset, nothing changes — a deployment serving itself
 * directly needs no stamp.
 */
export function trustedProxyMiddleware(): RequestHandler | null {
    if (!process.env.TRUSTED_PROXY_TOKEN)
        return null;

    return (req, res, next) => {
        if (OPEN_PATHS.has(req.path) || isFromTrustedProxy(req.headers) || isInternalService(req.headers)) {
            next();
            return;
        }

        res.status(403).json({ statusCode: 403, message: 'Forbidden' });
    };
}
