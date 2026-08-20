"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
exports.toRedisCreds = toRedisCreds;
const ioredis_1 = __importDefault(require("ioredis"));
const connection_manager_1 = require("./connection-manager");
class RedisConnectionManager extends connection_manager_1.ConnectionManager {
    createClient(c) {
        const client = new ioredis_1.default({
            host: c.host,
            port: c.port,
            username: c.username || undefined,
            password: c.password || undefined,
            db: c.db ?? 0,
            tls: c.tls ? {} : undefined,
            maxRetriesPerRequest: 1,
        });
        // Swallow connection-level error events so a bad host doesn't crash the process —
        // the per-command promise still rejects, so callers (loaders / onRun) see the error.
        client.on("error", () => { });
        return client;
    }
    disposeClient(client) { client.disconnect(); }
}
/** Process-wide singleton — the ioredis client manages its own connection internally. */
exports.redis = new RedisConnectionManager();
/**
 * Maps a decrypted credential record to a typed RedisCreds. Defensive coercion keeps
 * legacy string-encoded values working alongside the type-preserving ones.
 */
function toRedisCreds(values) {
    return {
        host: String(values.host ?? ""),
        port: Number(values.port),
        username: values.username ? String(values.username) : undefined,
        password: values.password ? String(values.password) : undefined,
        db: Number(values.db ?? 0),
        tls: values.tls === true || values.tls === "true",
    };
}
