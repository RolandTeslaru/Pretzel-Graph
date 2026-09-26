import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { Assistant, Library } from '@pretzel-graph/shared/domain';
import { System } from '@pretzel-graph/shared/system';
import { DB } from './index';

const log = System.log.withContext('Assistant');

// Resolves to packages/backend/assets from src, and to dist/backend/assets from a build.
const ASSET_PATH = path.resolve(__dirname, '../../assets/assistant.json');

/** The assistant workflow as shipped: its display fields and graph, written by `npm run export-assistant`. */
interface AssistantAsset {
    displayName: string
    description: string | null
    icon:        string | null
    accent:      string | null
    iconColor:   string | null
    data:        Record<string, unknown>
}

/** Installs the shipped assistant workflow, replacing the installed one when the shipped version differs. */
export async function installAssistant(): Promise<void> {
    let text: string;

    try {
        text = await fs.readFile(ASSET_PATH, 'utf8');
    }
    catch {
        log.warning('no assistant asset shipped; skipping install', { path: ASSET_PATH });
        return;
    }

    const asset   = JSON.parse(text) as AssistantAsset;
    const version = createHash('sha256').update(text).digest('hex');

    await DB.forMigrations().transaction().execute(async (trx) => {
        const workspace = await trx
            .selectFrom('workspace')
            .select('assistant_version')
            .forUpdate()
            .executeTakeFirstOrThrow();

        if (workspace.assistant_version === version)
            return;

        const fields = {
            display_name: asset.displayName,
            description:  asset.description,
            icon:         asset.icon,
            accent:       asset.accent,
            icon_color:   asset.iconColor,
            data:         asset.data as never,
            hidden:       true,
        };

        await trx
            .insertInto('workflows')
            .values({ ...fields, id: Assistant.WORKFLOW_ID, folder_id: Library.Folder.ROOT_ID, created_by: null, locked: false })
            .onConflict((oc) => oc.column('id').doUpdateSet(fields))
            .execute();

        await trx
            .updateTable('workspace')
            .set({ assistant_version: version })
            .execute();

        log.info('installed assistant workflow', { version: version.slice(0, 12) });
    });
}
