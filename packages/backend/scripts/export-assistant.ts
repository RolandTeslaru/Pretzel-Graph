import { promises as fs } from 'fs';
import path from 'path';

// Writes the shipped assistant from a workflow downloaded in the editor: npm run export-assistant -- <file>

const ASSET_PATH = path.resolve(__dirname, '../assets/assistant.json');

type Data = Record<string, unknown> & {
    credentialInstanceIds?: Record<string, unknown>
    dependencies?:          Record<string, { workflow_data?: Data }>
}

// Drops every attached credential instance, including inside embedded sub-workflows.
const withoutCredentials = (data: Data): Data => ({
    ...data,
    credentialInstanceIds: {},
    dependencies: Object.fromEntries(Object.entries(data.dependencies ?? {}).map(([key, dependency]) => [
        key,
        dependency.workflow_data ? { ...dependency, workflow_data: withoutCredentials(dependency.workflow_data) } : dependency,
    ])),
});

async function main(): Promise<void> {
    const [source] = process.argv.slice(2);

    if (!source) {
        console.error('usage: npm run export-assistant -- <downloaded workflow.json>');
        process.exit(1);
    }

    const workflow = JSON.parse(await fs.readFile(source, 'utf8'));

    if (typeof workflow?.data?.nodes !== 'object') {
        console.error(`${source} is not a downloaded workflow: it has no data.nodes`);
        process.exit(1);
    }

    const asset = {
        displayName: workflow.display_name ?? 'Assistant',
        description: workflow.description ?? null,
        icon:        workflow.icon ?? null,
        accent:      workflow.accent ?? null,
        iconColor:   workflow.icon_color ?? null,
        data:        withoutCredentials(workflow.data),
    };

    await fs.writeFile(ASSET_PATH, `${JSON.stringify(asset, null, 2)}\n`);

    console.log(`Wrote ${path.relative(process.cwd(), ASSET_PATH)} (${Object.keys(asset.data.nodes as object).length} nodes)`);
}

main();
