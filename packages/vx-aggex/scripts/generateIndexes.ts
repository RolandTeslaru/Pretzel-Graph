import * as fs from "fs";
import * as path from "path";

import { Foundations, Shelf } from "@vx-agent-editor/shared/types";

const NODES_ROOT = path.resolve(__dirname, "../src/nodes");
const OUTPUT_PATH = path.resolve(__dirname, "../dist/node_index.json")


async function traverseDir(dir: string, callback: (filePath: string) => Promise<void>) {
    const entries = fs.readdirSync(dir, { withFileTypes: true })

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            await traverseDir(fullPath, callback);
        }
        else {
            await callback(fullPath);
        }
    }
}

async function generateIndex() {
    const blueprints: Record<Foundations.Blueprint.Id, Foundations.Blueprint> = {}
    const drawers: Record<Shelf.Drawer.Id, Shelf.Drawer> = {}

    await traverseDir(NODES_ROOT, async (filePath) => {
        if (!filePath.endsWith("blueprint.ts"))
            return

        const module = await import(filePath);
        const blueprint = module.Blueprint as Foundations.Blueprint

        blueprints[blueprint.id] = blueprint
    })

    const index = {
        version: Date.now().toString(),
        generatedAt: new Date().toISOString(),
        drawers,
        blueprints,
    }

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(index, null, 2))
    console.log(`Successfully indexed ${Object.keys(blueprints).length} nodes in ${Object.keys(drawers).length} drawers`)
}

generateIndex().catch(err => {
    console.error(err);
})