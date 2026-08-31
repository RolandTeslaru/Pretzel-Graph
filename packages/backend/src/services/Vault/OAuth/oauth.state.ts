import { Injectable } from '@nestjs/common';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { SystemError, Vault } from '@pretzel-graph/shared/domain';
import { createRedisClient } from '@/utils/redis';

const TTL_MS = 10 * 60_000;

type State = Vault.OAuth.State;

@Injectable()
export class OAuthState {

    private readonly redis = createRedisClient('oauth.state');


    public async issue(input: Vault.OAuth.State.Input): Promise<string> {
        const nonce = randomBytes(16).toString('hex');

        await this.redis.set(this.key(nonce), '1', 'PX', TTL_MS);

        return this.sign({ ...input, nonce, exp: Date.now() + TTL_MS });
    }


    public async consume(raw: string): Promise<State> {
        const payload = this.verify(raw);

        if (Date.now() > payload.exp)
            throw new SystemError(SystemError.Code.BAD_REQUEST, 'This connection attempt expired; start again');

        const seen = await this.redis.getdel(this.key(payload.nonce));

        if (!seen)
            throw new SystemError(SystemError.Code.BAD_REQUEST, 'This connection attempt was already used; start again');

        return payload;
    }



    private key(nonce: string): string {
        return `oauth:state:${nonce}`;
    }


    // Derived from the vault key so no second secret has to be provisioned.
    private signingKey(): Buffer {
        const key = process.env.PRETZEL_ENCRYPTION_KEY;

        if (!key)
            throw new Error('PRETZEL_ENCRYPTION_KEY is not set');

        return createHmac('sha256', Buffer.from(key, 'hex')).update('oauth-state').digest();
    }


    private mac(encoded: string): string {
        return createHmac('sha256', this.signingKey()).update(encoded).digest('base64url');
    }


    private sign(payload: State): string {
        const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');

        return `${encoded}.${this.mac(encoded)}`;
    }


    private verify(raw: string): State {
        const [encoded, signature] = raw.split('.');

        if (!encoded || !signature)
            throw new SystemError(SystemError.Code.BAD_REQUEST, 'Malformed state');

        const expected = this.mac(encoded);

        if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected)))
            throw new SystemError(SystemError.Code.BAD_REQUEST, 'Bad state signature');

        const parsed = Vault.OAuth.State.Schema.safeParse(JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')));

        if (!parsed.success)
            throw new SystemError(SystemError.Code.BAD_REQUEST, 'Unreadable state');

        return parsed.data;
    }
}
