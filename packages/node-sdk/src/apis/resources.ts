import type { Vault } from "@pretzel-graph/shared/domain";
import type { InferCredentialValues } from "../types";
import type { PoolClient as PostgresConnection } from "pg";
import type { PoolConnection as MySqlConnection } from "mysql2/promise";
import type Redis from "ioredis";
import type { MongoClient } from "mongodb";
import type { Client as McpClient } from "@modelcontextprotocol/sdk/client/index.js";
import type { PostgresCreds } from "../db/postgres";
import type { MySqlCreds } from "../db/mysql";
import type { RedisCreds } from "../db/redis";
import type { MongoCreds } from "../db/mongo";
import type { McpCreds } from "../mcp/connection";



// Live clients are owned by the runtime host; nodes only receive this capability facade.
export interface ConnectionAPI {
    postgres: {
        withConnection: <T>(creds: PostgresCreds, fn: (connection: PostgresConnection) => Promise<T>) => Promise<T>,
    },
    mysql: {
        withConnection: <T>(creds: MySqlCreds, fn: (connection: MySqlConnection) => Promise<T>) => Promise<T>,
    },
    redis: {
        get: (creds: RedisCreds) => Promise<Redis>,
    },
    mongo: {
        get: (creds: MongoCreds) => Promise<MongoClient>,
    },
    mcp: {
        get: (creds: McpCreds) => Promise<McpClient>,
    },
}



// Looks up a stored credential instance and decrypts an encrypted blob off it.
export interface CredentialsAPI {
    getInstance:       (instanceId: Vault.Credential.Instance.Id) => Vault.Credential.Instance | undefined,
    getDecryptedValue: <T = unknown>(blob: Vault.Credential.Instance.EncryptedBlob<T>) => InferCredentialValues<T>,
    // OAuth2 instances only. Resolves to a token valid for at least the next minute.
    getAccessToken:    (instanceId: Vault.Credential.Instance.Id) => Promise<string>,
}
