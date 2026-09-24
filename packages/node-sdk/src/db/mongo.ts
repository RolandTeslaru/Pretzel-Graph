export type MongoCreds = {
    host: string;
    port?: number;     // blank ⇒ mongodb+srv (Atlas)
    database: string;
    user: string;
    password: string;
    tls?: boolean;
};

// Coerces a decrypted credential record into typed Mongo connection values; a blank port means SRV.
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
