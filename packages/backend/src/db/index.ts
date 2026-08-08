import { z } from 'zod';
import { Kysely, PostgresDialect, Transaction as KyselyTransaction, sql } from 'kysely';
import type { ColumnType, Generated } from 'kysely';
import { Pool, types as pgTypes, type CustomTypesConfig } from 'pg';
import {
    Auth,
    ApiKey as ApiKeyD,
    Library,
    SystemError,
    Vault,
    Chat           as ChatD,
    Execution      as ExecutionD,
    VersionControl as VersionControlD,
    Workflow       as WorkflowD,
} from '@pretzel-graph/shared/domain';
import { supabaseTimestamp } from '@pretzel-graph/shared/domain/zod-utils';
import { Principal } from '@/domain/Principal';

const OID_TIMESTAMP   = 1114;
const OID_TIMESTAMPTZ = 1184;

// node-postgres parses timestamps into Date; the row schemas are typed for
// strings and `supabaseTimestamp` already normalises Postgres' raw format
// (`2026-05-22 13:47:12.123456+00`). Scoped to these pools — node-sdk's Postgres
// node shares the driver and its results are user-facing.
const keepTimestampsAsStrings: CustomTypesConfig = {
    getTypeParser: ((oid: number, format?: unknown) =>
        oid === OID_TIMESTAMP || oid === OID_TIMESTAMPTZ
            ? (value: string) => value
            : (pgTypes.getTypeParser as (o: number, f?: unknown) => unknown)(oid, format)
    ) as CustomTypesConfig['getTypeParser'],
};

function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value)
        throw new Error(`${name} is not set`);
    return value;
}

function connect(urlEnvVar: string): Kysely<DB.Tables> {
    return new Kysely<DB.Tables>({
        dialect: new PostgresDialect({
            pool: new Pool({
                connectionString: requireEnv(urlEnvVar),
                max: 10,
                types: keepTimestampsAsStrings,
            }),
        }),
    });
}

// Lazy so importing this module can't crash a backend that hasn't been
// configured for it yet, and so env is read after load-env has run.
let rlsDb: Kysely<DB.Tables> | undefined;
let serviceDb: Kysely<DB.Tables> | undefined;

// DATABASE_URL_APP must log in as a role that is NOT the table owner and has NO
// BYPASSRLS — see supabase/snippets/kysely-app-role.sql. A forgotten scope then
// runs with auth.uid() null, so it sees only what a policy grants unconditionally
// (public rows), never another user's.
const rls = () => (rlsDb ??= connect('DATABASE_URL_APP'));

const service = () => (serviceDb ??= connect('DATABASE_URL_SERVICE'));

// The persistence truth: one schema per table, column for column. Domain types
// are referenced only for branded ids and for the contents of jsonb columns —
// never for the row shape itself, so a table and its concept can diverge.
// `toDomain` is the seam between them.
//
// `.default()` here means a real column default that Postgres would apply
// (`false`, `null`). Columns the database *generates* — ids, timestamps — carry
// no client-side value, so they are marked `Generated<>` in Tables instead.

export namespace DB {


    export namespace Workflow {
        export const Row = z.object({
            id:           WorkflowD.Id,
            user_id:      Auth.User.Id,
            folder_id:    Library.Folder.Id,
            display_name: z.string(),
            description:  z.string().nullable(),
            icon:         z.string().nullable(),
            accent:       z.string().nullable(),
            icon_color:   z.string().nullable(),
            locked:       z.boolean(),
            mcp_enabled:  z.boolean().nullable(),
            is_public:    z.boolean().default(false),
            data:         WorkflowD.Data.Schema,
            created_at:   z.coerce.date(),
            updated_at:   z.coerce.date(),
        });
        export type Row = z.infer<typeof Row>;

        export const toDomain = (row: Row) => WorkflowD.Schema.parse(row);
    }

    export namespace Folder {
        export const Row = z.object({
            id:               Library.Folder.Id,
            user_id:          Auth.User.Id,
            parent_folder_id: Library.Folder.Id.nullable(),
            display_name:     z.string(),
            description:      z.string().nullable(),
            is_root:          z.boolean(),
            created_at:       z.string(),
            updated_at:       z.string(),
        });
        export type Row = z.infer<typeof Row>;

        export const toDomain = (row: Row) => Library.Folder.Schema.parse(row);
    }

    export namespace Execution {
        export const Row = z.object({
            id:          ExecutionD.Id,
            user_id:     Auth.User.Id,
            workflow_id: WorkflowD.Id,
            chat_id:     ChatD.Id.nullable(),
            status:      ExecutionD.Status,
            duration:    z.number(),
            igniter:     ExecutionD.Igniter.Schema,
            session:     ExecutionD.Session.Schema,
            recording:   ExecutionD.Recording.Schema.nullable(),
            error:       SystemError.Schema.nullish(),
            created_at:  supabaseTimestamp,
            updated_at:  supabaseTimestamp,
        });
        export type Row = z.infer<typeof Row>;

        export const toDomain = (row: Row) => ExecutionD.Schema.parse(row);
    }

    export namespace Chat {
        export const Row = z.object({
            id:          ChatD.Id,
            user_id:     Auth.User.Id,
            workflow_id: WorkflowD.Id,
            name:        z.string(),
            attachments: z.unknown().nullable(),
            created_at:  supabaseTimestamp,
            updated_at:  supabaseTimestamp,
        });
        export type Row = z.infer<typeof Row>;

        // Message.Schema is a discriminated union on `role`, so the row is an
        // intersection rather than an .extend().
        export const MessageRow = ChatD.Message.Schema.and(z.object({
            chat_id:    ChatD.Id,
            created_at: supabaseTimestamp,
            updated_at: supabaseTimestamp,
        }));
        export type MessageRow = z.infer<typeof MessageRow>;

        export const toDomain = (row: Row) => ChatD.Schema.parse(row);
    }

    export namespace VersionControl {
        export const Row = z.object({
            id:            VersionControlD.Publication.Id,
            user_id:       Auth.User.Id,
            workflow_id:   WorkflowD.Id,
            workflow_data: WorkflowD.Data.Schema,
            version:       z.number().default(1),
            name:          z.string(),
            description:   z.string().nullable(),
            is_active:     z.boolean().default(true),
            published_at:  z.string(),
        });
        export type Row = z.infer<typeof Row>;

        /** Row shape a Meta query selects — no user_id, no workflow_data. */
        export type MetaRow = Omit<Row, 'user_id' | 'workflow_data'>;

        export const toDomain = (row: Row) => VersionControlD.Publication.Schema.parse(row);
        export const toMeta   = (row: MetaRow) => VersionControlD.Publication.Meta.Schema.parse(row);
    }

    export namespace CredentialInstance {
        export const Row = z.object({
            id:          Vault.Credential.Instance.Id,
            user_id:     Auth.User.Id,
            template_id: Vault.Credential.Template.Id,
            name:        z.string(),
            blob:        z.string().brand('EncryptedBlob'),
            created_at:  z.string(),
            updated_at:  z.string(),
        });
        export type Row = z.infer<typeof Row>;

        export const toDomain = (row: Row) => Vault.Credential.Instance.Schema.parse(row);
    }

    export namespace ApiKey {
        export const Row = z.object({
            id:           ApiKeyD.Id,
            user_id:      Auth.User.Id,
            name:         z.string(),
            prefix:       z.string(),
            key_hash:     z.string(),
            last_used_at: supabaseTimestamp.nullable(),
            expires_at:   supabaseTimestamp.nullable(),
            revoked_at:   supabaseTimestamp.nullable(),
            created_at:   supabaseTimestamp,
        });
        export type Row = z.infer<typeof Row>;

        export const toDomain = (row: Row) => ApiKeyD.Schema.parse(row);
    }

    export namespace User {
        export const Row = z.object({
            id:           Auth.User.Id,
            email:        z.string().nullable(),
            username:     z.string(),
            display_name: z.string(),
            avatar_url:   z.string().nullable(),
            is_admin:     z.boolean(),
            created_at:   z.string(),
            updated_at:   z.string(),
        });
        export type Row = z.infer<typeof Row>;

        export const toDomain = (row: Row) => Auth.User.Schema.parse(row);
    }

    // Kysely is generic over this — keys are the literal Postgres table names,
    // which is what `selectFrom('workflows')` resolves against. `Gen` lists the
    // columns Postgres fills in, so they stay optional on insert.
    type Table<T extends z.ZodTypeAny, Gen extends keyof z.output<T> = never> = {
        [K in keyof z.output<T>]: K extends Gen
            ? Generated<z.output<T>[K]>
            : ColumnType<
                z.output<T>[K],
                K extends keyof z.input<T> ? z.input<T>[K] : z.output<T>[K],
                K extends keyof z.input<T> ? z.input<T>[K] : z.output<T>[K]
            >
    };

    type Stamps = 'created_at' | 'updated_at';

    export interface Tables {
        users:               Table<typeof User.Row, Stamps>;
        folders:             Table<typeof Folder.Row, 'id' | Stamps>;
        workflows:           Table<typeof Workflow.Row, 'id' | Stamps>;
        executions:          Table<typeof Execution.Row, 'id' | Stamps>;
        chats:               Table<typeof Chat.Row, 'id' | Stamps>;
        chat_messages:       Table<typeof Chat.MessageRow, 'id' | Stamps>;
        version_control:     Table<typeof VersionControl.Row, 'id' | 'published_at'>;
        api_keys:            Table<typeof ApiKey.Row, 'id' | 'created_at'>;
        credential_instance: Table<typeof CredentialInstance.Row, 'id' | Stamps>;
    }

    export const Role = { User: 'user', Service: 'service' } as const;
    export type  Role = typeof Role[keyof typeof Role];

    /**
     * A transaction, branded with the identity it runs as. No default on `R` —
     * a signature must state which roles it accepts, so the permissive form
     * costs more to write than the safe one.
     */
    export type Transaction<R extends Role> = KyselyTransaction<Tables> & { readonly __as: R };

    /** The common case: RLS is on and auth.uid() is the acting user. */
    export type UserTransaction = Transaction<typeof Role.User>;

    /**
     * A transaction with its identity already bound, passed as a value. Lets one
     * code path be reached as a user or as the service role without branching:
     * `(fn) => DB.asUser(principal, fn)` / `(fn) => DB.asService(why, fn)`.
     * The role is erased here — this is why the runtime tag exists.
     */
    export type Delegate = <T>(fn: (trx: Transaction<Role>) => Promise<T>) => Promise<T>;

    // The brand is a phantom type, so @AllowedDatabaseRoles has nothing to read.
    // symbol is the runtime half — attached by the two functions below, checked
    // by the decorator. Symbol.for so a duplicated module still matches.
    const ROLE = Symbol.for('pretzel.db.role');

    const tag = <R extends Role>(trx: KyselyTransaction<Tables>, role: R): Transaction<R> => {
        Object.defineProperty(trx, ROLE, { value: role, enumerable: false, configurable: true });
        return trx as Transaction<R>;
    };

    export const roleOf = (handle: unknown): Role | undefined =>
        (handle as Record<symbol, Role> | null | undefined)?.[ROLE];

    // Only what the wrapper needs, so a future ApiKey principal satisfies it.
    type ActingUser = Pick<Principal.User, 'userId'>;

    /** Runs `fn` inside a transaction acting as `principal`, with RLS enforced. */
    export async function asUser<T>(
        principal: ActingUser,
        fn: (trx: UserTransaction) => Promise<T>,
    ): Promise<T> {
        const claims = JSON.stringify({ sub: principal.userId, role: 'authenticated' });

        return rls().transaction().execute(async (trx) => {
            // set_config, not SET LOCAL: SET takes no bind parameters, so the
            // claims would have to be interpolated. The `true` scopes both to
            // this transaction — with `false` the identity outlives it on a
            // pooled connection and leaks to the next request.
            await sql`
                select
                    set_config('role', 'authenticated', true),
                    set_config('request.jwt.claims', ${claims}, true)
            `.execute(trx);

            return fn(tag(trx, Role.User));
        });
    }

    /** Runs `fn` with RLS bypassed. `reason` is mandatory so every bypass is greppable. */
    export async function asService<T>(
        reason: string,
        fn: (trx: Transaction<typeof Role.Service>) => Promise<T>,
    ): Promise<T> {
        void reason;
        return service().transaction().execute((trx) => fn(tag(trx, Role.Service)));
    }

    export async function destroyPools(): Promise<void> {
        await Promise.all([rlsDb?.destroy(), serviceDb?.destroy()]);
        rlsDb = undefined;
        serviceDb = undefined;
    }
}
