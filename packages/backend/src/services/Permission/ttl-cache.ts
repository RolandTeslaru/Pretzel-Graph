/**
 * A bounded, expiring map. One instance per resource kind, so TTL and capacity are chosen
 * for what is being cached rather than shared across everything.
 */
export class TtlCache<K, V> {

    private entries = new Map<K, { value: V, expiresAt: number }>();

    constructor(
        private readonly ttlMs: number,
        private readonly max:   number,
    ) {}

    get(key: K): V | undefined {
        const hit = this.entries.get(key);

        if (!hit)
            return undefined;

        if (hit.expiresAt <= Date.now()) {
            this.entries.delete(key);
            return undefined;
        }

        return hit.value;
    }

    set(key: K, value: V) {
        this.makeRoom();

        // Delete first: Map.set on an existing key updates the value but keeps the key's
        // original position, so refreshing an entry would otherwise leave it at the front
        // of the eviction queue despite being the most recently written.
        this.entries.delete(key);

        this.entries.set(key, { value, expiresAt: Date.now() + this.ttlMs });
    }

    delete(key: K) {
        this.entries.delete(key);
    }

    get size() {
        return this.entries.size;
    }

    prune() {
        const now = Date.now();

        for (const [key, entry] of this.entries)
            if (entry.expiresAt <= now)
                this.entries.delete(key);
    }

    /**
     * Sweeps expired entries first, and only evicts a live one if that freed nothing — so a
     * cache full of unexpired entries degrades to oldest-first eviction rather than growing
     * without bound.
     */
    private makeRoom() {
        if (this.entries.size < this.max)
            return;

        this.prune();

        while (this.entries.size >= this.max) {
            const oldest = this.entries.keys().next();

            if (oldest.done)
                return;

            this.entries.delete(oldest.value);
        }
    }
}
