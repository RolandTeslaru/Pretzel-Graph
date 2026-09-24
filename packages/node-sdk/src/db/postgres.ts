export type PostgresCreds = {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    ssl?: boolean;
};

// Coerces a decrypted credential record into typed Postgres connection values.
export function toPgCreds(values: Record<string, unknown>): PostgresCreds {
    return {
        host: String(values.host ?? ""),
        port: Number(values.port),
        database: String(values.database ?? ""),
        user: String(values.user ?? ""),
        password: String(values.password ?? ""),
        ssl: values.ssl === true || values.ssl === "true",
    };
}
