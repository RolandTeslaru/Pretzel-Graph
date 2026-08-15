import { promises as fs } from 'fs';
import path from 'path';
import { sql } from 'kysely';
import { Migrator } from 'kysely/migration';
import type { Kysely } from 'kysely';
import type { Migration, MigrationProvider } from 'kysely/migration';
import { DB } from './index';

// Resolves to packages/backend/migrations from src, and to dist/backend/migrations
// from a build — the build copies the folder alongside the compiled output.
const MIGRATIONS_DIR = path.resolve(__dirname, '../../migrations');

// Kysely's FileMigrationProvider imports JS modules and ignores .sql outright.
class SqlMigrationProvider implements MigrationProvider {

    constructor(private readonly folder: string) {}

    async getMigrations(): Promise<Record<string, Migration>> {
        const files = (await fs.readdir(this.folder))
            .filter((file) => file.endsWith('.sql'))
            .sort();

        const migrations: Record<string, Migration> = {};

        for (const file of files) {
            const text = await fs.readFile(path.join(this.folder, file), 'utf8');

            migrations[path.basename(file, '.sql')] = {
                up: async (db: Kysely<unknown>) => {
                    await sql.raw(text).execute(db);
                },
            };
        }

        return migrations;
    }
}

/** Brings the database to the current schema. Throws if any migration fails. */
export async function runMigrations(): Promise<void> {
    const db = DB.forMigrations();

    const migrator = new Migrator({
        db,
        provider: new SqlMigrationProvider(MIGRATIONS_DIR),
    });

    const { error, results } = await migrator.migrateToLatest();

    for (const result of results ?? []) {
        if (result.status === 'Success')
            console.log(`[migrate] applied ${result.migrationName}`);
        if (result.status === 'Error')
            console.error(`[migrate] failed ${result.migrationName}`);
    }

    if (error)
        throw error instanceof Error ? error : new Error(String(error));

    if (!results?.length)
        console.log('[migrate] schema up to date');
}
