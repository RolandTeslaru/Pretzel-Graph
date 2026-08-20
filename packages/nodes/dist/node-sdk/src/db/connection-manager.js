"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionManager = void 0;
const crypto_1 = require("crypto");
const TTL = 5 * 60_000;
const SWEEP = 60_000;
/**
 * Caches an expensive-to-create client (pool / driver client) keyed by a hash of the
 * decrypted credentials, with a TTL reaper. The caching/keying/lifecycle is shared by
 * every database; subclasses only implement how to create and dispose the client.
 *
 * Each process gets its own instance — loaders run in the backend, execution in the
 * worker, so the two pools are independent (acceptable).
 */
class ConnectionManager {
    map = new Map();
    constructor() {
        const timer = setInterval(() => this.reap(), SWEEP);
        // Don't keep the event loop alive just for the reaper.
        timer.unref?.();
    }
    /**
     * sha1 of the decrypted creds — NOT the credential id. Hashed so decrypted secrets
     * aren't sitting as plaintext map keys. Identical creds collapse onto one client.
     */
    key(creds) {
        return (0, crypto_1.createHash)("sha1").update(JSON.stringify(creds)).digest("base64");
    }
    async get(creds) {
        const k = this.key(creds);
        let reg = this.map.get(k);
        if (!reg) {
            reg = { client: await this.createClient(creds), lastUsed: 0 };
            this.map.set(k, reg);
        }
        reg.lastUsed = Date.now();
        return reg.client;
    }
    reap() {
        const now = Date.now();
        for (const [k, reg] of this.map) {
            if (now - reg.lastUsed > TTL) {
                this.map.delete(k);
                void this.disposeClient(reg.client);
            }
        }
    }
    purge() {
        for (const [k, reg] of this.map) {
            this.map.delete(k);
            void this.disposeClient(reg.client);
        }
    }
}
exports.ConnectionManager = ConnectionManager;
