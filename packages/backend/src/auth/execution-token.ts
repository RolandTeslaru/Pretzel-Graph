import { createHmac, timingSafeEqual } from 'node:crypto';
import { Execution } from '@pretzel-graph/shared/domain';

/**
 * A per-execution bearer credential, minted at enqueue and presented by the worker
 * on internal routes. The execution id is read from here, never from the request
 * body, so a node cannot address an execution it was not handed.
 *
 * Signed, not encrypted — the payload is readable, it just cannot be forged.
 * The key is backend-only; the worker holds tokens and can neither mint nor alter one.
 * See SPECS/execution-token-delegation.md.
 */
export namespace ExecutionToken {

    // Generous by design: a run suspended for human review must still be able to
    // report back when it resumes. See the spec's open question on reissue.
    export const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

    /** Never leaves this module — the worker carries a token, it never reads one. */
    export type Payload = {
        executionId: Execution.Id;
        exp: number;
    };

    export class InvalidError extends Error {
        constructor(reason: string) {
            super(reason);
            this.name = 'ExecutionToken.InvalidError';
        }
    }

    function signingKey(): string {
        const key = process.env.EXECUTION_TOKEN_SIGNING_KEY;

        // Never fall back to a default — an empty key makes every token forgeable.
        if (!key)
            throw new Error('EXECUTION_TOKEN_SIGNING_KEY is not set');

        return key;
    }

    const encode = (value: string) => Buffer.from(value, 'utf8').toString('base64url');
    const decode = (value: string) => Buffer.from(value, 'base64url').toString('utf8');

    const mac = (payload: string) =>
        createHmac('sha256', signingKey()).update(payload).digest('base64url');

    export function sign(
        executionId: Execution.Id,
        ttlMs: number = DEFAULT_TTL_MS,
    ): Execution.Token {
        const payload: Payload = { executionId, exp: Date.now() + ttlMs };
        const encoded = encode(JSON.stringify(payload));

        return `${encoded}.${mac(encoded)}` as Execution.Token;
    }

    export function verify(token: string): Payload {
        const [encoded, signature] = token.split('.');

        if (!encoded || !signature)
            throw new InvalidError('Malformed execution token');

        const expected = mac(encoded);

        // Compare as fixed-length buffers — timingSafeEqual throws on a length
        // mismatch, which would itself leak, so check the length first.
        if (signature.length !== expected.length)
            throw new InvalidError('Bad execution token signature');

        if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected)))
            throw new InvalidError('Bad execution token signature');

        let payload: Payload;

        try {
            payload = JSON.parse(decode(encoded)) as Payload;
        }
        catch {
            throw new InvalidError('Unreadable execution token payload');
        }

        if (typeof payload.exp !== 'number' || !payload.executionId)
            throw new InvalidError('Incomplete execution token payload');

        if (Date.now() > payload.exp)
            throw new InvalidError('Execution token expired');

        return payload;
    }
}
