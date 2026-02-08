import * as fs from "fs";
import * as path from "path";

import { Foundations, Shelf } from "@vx-agent-editor/shared/types";
import { Runtime } from "../src/runtime"

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
    const nodeDefinitionMetas: Record<Foundations.NodeDefinition.Id, Shelf.NodeMeta> = {}

    const drawers: Record<Shelf.Drawer.Id, Shelf.Drawer> = {}

    await traverseDir(NODES_ROOT, async (filePath) => {
        if (!filePath.endsWith("definition.ts"))
            return

        const module = await import(filePath);
        const def = module.Definition as Foundations.NodeDefinition

        nodeDefinitionMetas[def.id] = {
            definitionId: def.id,
            displayName: def.displayName,
            icon: def.icon,
            drawerId: def.drawerId
        }

        if (!drawers[def.drawerId]) {

            const savedDrawer = Shelf.Drawer.ALL_DRAWERS[def.drawerId]
            if (!savedDrawer)
                throw new Error(`No Drawer found for id: ${def.drawerId}. Current NodeDefintion is ${def.id}`)

            drawers[def.drawerId] = {
                id: def.drawerId,
                displayName: savedDrawer.displayName,
                icon: savedDrawer.icon,
                definitionIds: []
            }
        }

        drawers[def.drawerId].definitionIds.push(def.id)
    })

    const index = {
        version: Date.now().toString(),
        generatedAt: new Date().toISOString(),
        drawers,
        nodeDefinitionMetas,
    }

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(index, null, 2))
    console.log("Successfully indexed the nodes folder")
}

generateIndex().catch(err => {
    console.error(err);
})