import type { MongoClient } from "mongodb";
import type { MongoCreds } from "@pretzel-graph/node-sdk";
import { ConnectionManager } from "./connection-manager";

export class MongoConnectionManager extends ConnectionManager<MongoCreds, MongoClient> {
    protected async createClient(creds: MongoCreds): Promise<MongoClient> {
        const { MongoClient: Client } = await import("mongodb");
        const auth = `${encodeURIComponent(creds.user)}:${encodeURIComponent(creds.password)}`;
        const base = creds.port
            ? `mongodb://${auth}@${creds.host}:${creds.port}`
            : `mongodb+srv://${auth}@${creds.host}`;
        const uri = creds.tls ? `${base}/?tls=true` : base;

        return Client.connect(uri, { maxPoolSize: 4 });
    }

    protected disposeClient(client: MongoClient): Promise<void> { return client.close(); }
}
