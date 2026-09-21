import { createHash } from "node:crypto";

const TTL_MS = 5 * 60_000;
const SWEEP_MS = 60_000;

type Registration<TClient> = { client: TClient; lastUsed: number };

// Owns a bounded set of reusable clients for one connection kind.
export abstract class ConnectionManager<TCreds, TClient> {

    private readonly clients = new Map<string, Registration<TClient>>();




    constructor() {
        const timer = setInterval(() => this.reap(), SWEEP_MS);
        timer.unref();
    }




    protected abstract createClient(creds: TCreds): Promise<TClient> | TClient;
    protected abstract disposeClient(client: TClient): Promise<void> | void;

    protected isIdle(_client: TClient): boolean {
        return true;
    }




    public async get(creds: TCreds): Promise<TClient> {
        const key = createHash("sha1").update(JSON.stringify(creds)).digest("base64");
        let registration = this.clients.get(key);

        if (!registration) {
            registration = { client: await this.createClient(creds), lastUsed: 0 };
            this.clients.set(key, registration);
        }

        registration.lastUsed = Date.now();

        return registration.client;
    }




    public async purge(): Promise<void> {
        const disposals: Array<Promise<void> | void> = [];

        for (const [key, registration] of this.clients) {
            this.clients.delete(key);
            disposals.push(this.disposeClient(registration.client));
        }

        await Promise.allSettled(disposals);
    }




    private reap(): void {
        const now = Date.now();

        for (const [key, registration] of this.clients) {
            if (now - registration.lastUsed <= TTL_MS || !this.isIdle(registration.client))
                continue;

            this.clients.delete(key);
            void this.disposeClient(registration.client);
        }
    }
}

export abstract class SqlConnectionManager<TCreds, TPool, TConnection>
    extends ConnectionManager<TCreds, TPool> {

    protected abstract acquire(pool: TPool): Promise<TConnection>;
    protected abstract reset(connection: TConnection): Promise<void>;
    protected abstract release(connection: TConnection): void;




    public async withConnection<T>(
        creds: TCreds,
        use: (connection: TConnection) => Promise<T>,
    ): Promise<T> {
        const pool = await this.get(creds);
        const connection = await this.acquire(pool);

        try {
            return await use(connection);
        }
        finally {
            await this.reset(connection);
            this.release(connection);
        }
    }
}
