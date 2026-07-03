import "reflect-metadata";
import * as fs from "fs";
import * as path from "path";
import { config } from "dotenv";

config({ path: path.resolve(__dirname, "../../../../../.env") });

import { Foundations, Shelf, Workflow } from "@pretzel-graph/shared/domain"
import { extractExposedPorts } from "@pretzel-graph/shared/subworkflow"
import { createClient } from "@supabase/supabase-js";
import { cloneDeep } from "lodash";
import { PUBLIC_WORKFLOW_BLUEPRINTS, PUBLIC_WORKFLOW_BLUEPRINTS_REVERSE } from "@pretzel-graph/shared/constants/publicWorkflows";

const NODES_ROOT = path.resolve(__dirname, "../../..");
const OUTPUT_PATH = path.resolve(__dirname, "../../../dist/node_index.json")
const BACKEND_TARGET = path.resolve(__dirname, "../../../../backend/src/services/Shelf/node_index.json");
const BACKEND_SERVICE_FILE = path.resolve(__dirname, "../../../../backend/src/services/Shelf/service.ts");
const GLOBAL_WORKFLOWS_CACHE = path.resolve(__dirname, "../../../globalPretzelWorkflows.json");

const DEV_USER_ID = "9a0a1560-ac61-4ce8-a468-3f717588d838";

function mergeFieldsById(
    baseFields: readonly Foundations.Field[],
    dependencyFields: readonly Foundations.Field[],
): Foundations.Field[] {
    const fieldsById = new Map<Foundations.Field.Id, Foundations.Field>()
    for (const field of baseFields)
        fieldsById.set(field.id, field)
    for (const field of dependencyFields)
        if (!fieldsById.has(field.id))
            fieldsById.set(field.id, field)
    return [...fieldsById.values()]
}

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


const db_pretzel_blueprints: Record<string, Foundations.Blueprint> = {}

export async function generateIndex(includeDbBlueprints = false) {
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

    if (includeDbBlueprints) {
        const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

        const { data, error } = await supabase
            .from("workflows")
            .select("id, display_name, icon, accent, data")
            .eq("user_id", DEV_USER_ID)
            .eq("is_public", true)

        if (error) throw error;

        const baseBlueprint = cloneDeep(blueprints["Core.SubWorkflow.Execute" as Foundations.Blueprint.Id]);

        for (const row of data ?? []) {
            const workflowData = row.data as Workflow.Data;
            const dependencyFields = workflowData.fields ?? [];
            const { inputs, outputs } = extractExposedPorts(workflowData);

            
            const blueprintId = PUBLIC_WORKFLOW_BLUEPRINTS_REVERSE[row.id];

            const bp: Foundations.Blueprint = {
                ...baseBlueprint,
                id: blueprintId,
                displayName: row.display_name,
                ui: {
                    icon: row.icon ?? baseBlueprint.ui.icon,
                    accent: row.accent ?? baseBlueprint.ui.accent,
                    iconColor: baseBlueprint.ui.iconColor,
                },
                fields: mergeFieldsById(baseBlueprint.fields, dependencyFields),
                inputs,
                outputs,
                flags: {
                    SHOW_DEPENDENCY_SELECTOR: false
                },
                dependency: { workflowId: row.id, mode: "publication" as const },
            };
            console.log(`Processing public workflow: ${bp.id} (${bp.dependency?.workflowId}) with ${inputs.length} inputs, ${outputs.length} outputs, and ${dependencyFields.length} dependency fields`)
            
            db_pretzel_blueprints[blueprintId] = bp;
        }

        index.blueprints = {
            ...index.blueprints,
            ...db_pretzel_blueprints,
        }
        console.log(`Fetched ${Object.keys(db_pretzel_blueprints).length} public blueprints from DB`)
        fs.writeFileSync(GLOBAL_WORKFLOWS_CACHE, JSON.stringify(db_pretzel_blueprints, null, 2))
        console.log(`Cached global workflow blueprints to ${GLOBAL_WORKFLOWS_CACHE}`)
    } else if (fs.existsSync(GLOBAL_WORKFLOWS_CACHE)) {
        const cached = JSON.parse(fs.readFileSync(GLOBAL_WORKFLOWS_CACHE, 'utf-8')) as Record<string, Foundations.Blueprint>
        index.blueprints = { ...index.blueprints, ...cached }
        console.log(`Merged ${Object.keys(cached).length} cached global workflow blueprints`)
    }

    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true })
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(index, null, 2))
    console.log(`Successfully indexed ${Object.keys(blueprints).length} nodes in ${Object.keys(drawers).length} drawers`)

    if (fs.existsSync(path.dirname(BACKEND_TARGET))) {
        fs.copyFileSync(OUTPUT_PATH, BACKEND_TARGET);
        console.log(`Synced index to backend at ${BACKEND_TARGET}`);

        if (fs.existsSync(BACKEND_SERVICE_FILE)) {
            const time = new Date();
            fs.utimesSync(BACKEND_SERVICE_FILE, time, time);
            console.log(`Touched ${BACKEND_SERVICE_FILE} to trigger backend reload`);
        }
    }
}

if (require.main === module) {
    generateIndex(true).catch(err => {
        console.error(err);
    })
}