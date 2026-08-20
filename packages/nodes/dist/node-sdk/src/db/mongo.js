"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mongo = void 0;
exports.toMongoCreds = toMongoCreds;
const mongodb_1 = require("mongodb");
const connection_manager_1 = require("./connection-manager");
/** Compose a connection URI from discrete credential fields (no connection-string field). */
function composeUri(c) {
    const auth = `${encodeURIComponent(c.user)}:${encodeURIComponent(c.password)}`;
    const base = c.port
        ? `mongodb://${auth}@${c.host}:${c.port}`
        : `mongodb+srv://${auth}@${c.host}`;
    return c.tls ? `${base}/?tls=true` : base;
}
class MongoConnectionManager extends connection_manager_1.ConnectionManager {
    createClient(c) {
        return mongodb_1.MongoClient.connect(composeUri(c));
    }
    disposeClient(client) { return client.close(); }
}
/** Process-wide singleton — the MongoClient pools connections internally. */
exports.mongo = new MongoConnectionManager();
/**
 * Maps a decrypted credential record to a typed MongoCreds. Defensive coercion keeps legacy
 * string-encoded values working; a blank port stays undefined (⇒ SRV).
 */
function toMongoCreds(values) {
    const port = values.port === undefined || values.port === "" ? undefined : Number(values.port);
    return {
        host: String(values.host ?? ""),
        port,
        database: String(values.database ?? ""),
        user: String(values.user ?? ""),
        password: String(values.password ?? ""),
        tls: values.tls === true || values.tls === "true",
    };
}
