export type MySqlCreds = {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    ssl?: boolean;
};

// Coerces a decrypted credential record into typed MySQL connection values.
export function toMySqlCreds(values: Record<string, unknown>): MySqlCreds {
    return {
        host: String(values.host ?? ""),
        port: Number(values.port),
        database: String(values.database ?? ""),
        user: String(values.user ?? ""),
        password: String(values.password ?? ""),
        ssl: values.ssl === true || values.ssl === "true",
    };
}
