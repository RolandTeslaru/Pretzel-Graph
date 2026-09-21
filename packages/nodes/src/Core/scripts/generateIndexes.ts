import "reflect-metadata";
import * as fs from "fs";
import * as path from "path";
import { config } from "dotenv";

config({ path: path.resolve(__dirname, "../../../../../.env") });

import { Foundations, Gateway, Shelf } from "@pretzel-graph/shared/domain"

const NODES_ROOT = path.resolve(__dirname, "../../..");
const BACKEND_TARGET = path.resolve(__dirname, "../../../../backend/assets/blueprint_index.json");
const GATEWAY_TARGET = path.resolve(__dirname, "../../../../backend/assets/gateway_definitions_index.json");
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
    const gatewayDefinitions: Record<Gateway.Definition.Id, Gateway.Definition> = {}

    await traverseDir(NODES_ROOT, async (filePath) => {
        if (filePath.endsWith("blueprint.ts")) {
            const module = await import(filePath);
            const blueprint = Foundations.Blueprint.Schema.parse(module.Blueprint);

            blueprints[blueprint.id] = blueprint
        }

        if (filePath.endsWith("definition.ts")) {
            const module = await import(filePath);
            const definition = Gateway.Definition.Schema.parse(module.Definition);

            gatewayDefinitions[definition.id] = definition
        }
    })

    const index = {
        version: Date.now().toString(),
        generatedAt: new Date().toISOString(),
        drawers,
        blueprints,
    }

    const gatewayIndex = {
        version: index.version,
        generatedAt: index.generatedAt,
        definitions: gatewayDefinitions,
    }


    console.log(`Successfully indexed ${Object.keys(blueprints).length} nodes in ${Object.keys(drawers).length} drawers, ${Object.keys(gatewayDefinitions).length} gateway definitions`)

    fs.mkdirSync(path.dirname(BACKEND_TARGET), { recursive: true });
    fs.writeFileSync(BACKEND_TARGET, JSON.stringify(index, null, 2));
    console.log(`Wrote index to ${BACKEND_TARGET}`);

    fs.writeFileSync(GATEWAY_TARGET, JSON.stringify(gatewayIndex, null, 2));
    console.log(`Wrote gateway definitions to ${GATEWAY_TARGET}`);

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