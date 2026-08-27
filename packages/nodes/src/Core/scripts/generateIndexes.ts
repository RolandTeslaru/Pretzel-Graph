import "reflect-metadata";
import * as fs from "fs";
import * as path from "path";
import { config } from "dotenv";

config({ path: path.resolve(__dirname, "../../../../../.env") });

import { Foundations, Shelf } from "@pretzel-graph/shared/domain"

const NODES_ROOT = path.resolve(__dirname, "../../..");
const BACKEND_TARGET = path.resolve(__dirname, "../../../../backend/assets/blueprint_index.json");
const BACKEND_SERVICE_FILE = path.resolve(__dirname, "../../../../backend/src/services/Shelf/service.ts");



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


export async function generateIndex() {
    const blueprints: Record<Foundations.Blueprint.Id, Foundations.Blueprint> = {}
    const drawers: Record<Shelf.Drawer.Id, Shelf.Drawer> = {}

    await traverseDir(NODES_ROOT, async (filePath) => {
        if (!filePath.endsWith("blueprint.ts"))
            return

        const module = await import(filePath);
        const blueprint = Foundations.Blueprint.Schema.parse(module.Blueprint);

        blueprints[blueprint.id] = blueprint
    })

    const index = {
        version: Date.now().toString(),
        generatedAt: new Date().toISOString(),
        drawers,
        blueprints,
    }


    console.log(`Successfully indexed ${Object.keys(blueprints).length} nodes in ${Object.keys(drawers).length} drawers`)

    fs.mkdirSync(path.dirname(BACKEND_TARGET), { recursive: true });
    fs.writeFileSync(BACKEND_TARGET, JSON.stringify(index, null, 2));
    console.log(`Wrote index to ${BACKEND_TARGET}`);

    if (fs.existsSync(BACKEND_SERVICE_FILE)) {
        const time = new Date();
        fs.utimesSync(BACKEND_SERVICE_FILE, time, time);
        console.log(`Touched ${BACKEND_SERVICE_FILE} to trigger backend reload`);
    }
}

if (require.main === module) {
    generateIndex().catch(err => {
        console.error(err);
    })
}