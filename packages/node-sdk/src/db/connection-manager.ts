import { createHash } from "crypto";

const TTL = 5 * 60_000;
const SWEEP = 60_000;

type Registration<TClient> = { client: TClient; lastUsed: number };

/**
 * Caches an expensive-to-create client (pool / driver client) keyed by a hash of the
 * decrypted credentials, with a TTL reaper. The caching/keying/lifecycle is shared by
 * every database; subclasses only implement how to create and dispose the client.
 *
 * Each process gets its own instance — loaders run in the backend, execution in the
 * worker, so the two pools are independent (acceptable).
 */
export abstract class ConnectionManager<TCreds, TClient> {
    private map = new Map<string, Registration<TClient>>();

    // Every manager, so shutdown can purge them without knowing the drivers.
    private static instances: ConnectionManager<unknown, unknown>[] = [];

    constructor() {
        const timer = setInterval(() => this.reap(), SWEEP);
        // Don't keep the event loop alive just for the reaper.
        (timer as { unref?: () => void }).unref?.();

        ConnectionManager.instances.push(this as ConnectionManager<unknown, unknown>);
    }

    /** Closes every cached client of every manager. Awaits the disposals. */
    static async purgeAll(): Promise<void> {
        await Promise.allSettled(ConnectionManager.instances.map((m) => m.purge()));
    }

    /** Build the underlying client/pool from decrypted credentials. */
    protected abstract createClient(creds: TCreds): Promise<TClient> | TClient;

    /** Tear it down (pool.end / client.close / ...). */
    protected abstract disposeClient(client: TClient): Promise<void> | void;

    /**
     * Whether the client can be disposed right now. Drivers that can tell
     * report in-flight work; the default says yes, which is the pre-existing
     * behaviour for drivers that cannot.
     */
    protected isIdle(_client: TClient): boolean {
        return true;
    }

    /**
     * sha1 of the decrypted creds — NOT the credential id. Hashed so decrypted secrets
     * aren't sitting as plaintext map keys. Identical creds collapse onto one client.
     */
    protected key(creds: TCreds): string {
        return createHash("sha1").update(JSON.stringify(creds)).digest("base64");
    }

    async get(creds: TCreds): Promise<TClient> {
        const k = this.key(creds);
        let reg = this.map.get(k);
        if (!reg) {
            reg = { client: await this.createClient(creds), lastUsed: 0 };
            this.map.set(k, reg);
        }
        reg.lastUsed = Date.now();
        return reg.client;
    }

    private reap(): void {
        const now = Date.now();
        for (const [k, reg] of this.map) {
            if (now - reg.lastUsed > TTL) {
                // A query outliving the TTL keeps its pool: disposing under it
                // would kill the connection mid-flight. Rechecked next sweep.
                if (!this.isIdle(reg.client))
                    continue;

                this.map.delete(k);
                void this.disposeClient(reg.client);
            }
        }
    }

    async purge(): Promise<void> {
        const disposals: (Promise<void> | void)[] = [];

        for (const [k, reg] of this.map) {
            this.map.delete(k);
            disposals.push(this.disposeClient(reg.client));
        }

        await Promise.allSettled(disposals);
    }
}
