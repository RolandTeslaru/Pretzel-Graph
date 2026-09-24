export type RedisCreds = {
    host: string;
    port: number;
    username?: string;
    password?: string;
    db?: number;
    tls?: boolean;
};

// Coerces a decrypted credential record into typed Redis connection values.
export function toRedisCreds(values: Record<string, unknown>): RedisCreds {
    return {
        host: String(values.host ?? ""),
        port: Number(values.port),
        username: values.username ? String(values.username) : undefined,
        password: values.password ? String(values.password) : undefined,
        db: Number(values.db ?? 0),
        tls: values.tls === true || values.tls === "true",
    };
}
