import { MongoClient } from "mongodb";
import { ConnectionManager } from "./connection-manager";

export type MongoCreds = {
    host: string;
    port?: number;     // blank ⇒ mongodb+srv (Atlas)
    database: string;
    user: string;
    password: string;
    tls?: boolean;
};

/** Compose a connection URI from discrete credential fields (no connection-string field). */
function composeUri(c: MongoCreds): string {
    const auth = `${encodeURIComponent(c.user)}:${encodeURIComponent(c.password)}`;
    const base = c.port
        ? `mongodb://${auth}@${c.host}:${c.port}`
        : `mongodb+srv://${auth}@${c.host}`;
    return c.tls ? `${base}/?tls=true` : base;
}

class MongoConnectionManager extends ConnectionManager<MongoCreds, MongoClient> {
    protected createClient(c: MongoCreds): Promise<MongoClient> {
        return MongoClient.connect(composeUri(c));
    }
    protected disposeClient(client: MongoClient): Promise<void> { return client.close(); }
}

/** Process-wide singleton — the MongoClient pools connections internally. */
export const mongo = new MongoConnectionManager();

/**
 * Maps a decrypted credential record to a typed MongoCreds. Defensive coercion keeps legacy
 * string-encoded values working; a blank port stays undefined (⇒ SRV).
 */
export function toMongoCreds(values: Record<string, unknown>): MongoCreds {
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
