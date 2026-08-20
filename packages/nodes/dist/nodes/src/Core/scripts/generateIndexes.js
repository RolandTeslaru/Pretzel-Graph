"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateIndex = generateIndex;
require("reflect-metadata");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)({ path: path.resolve(__dirname, "../../../../../.env") });
const domain_1 = require("../../../../shared/domain");
const subworkflow_1 = require("../../../../shared/subworkflow");
const pg_1 = require("pg");
const lodash_1 = require("lodash");
const publicWorkflows_1 = require("../../../../shared/constants/publicWorkflows");
const NODES_ROOT = path.resolve(__dirname, "../../..");
const OUTPUT_PATH = path.resolve(__dirname, "../../../dist/node_index.json");
const BACKEND_TARGET = path.resolve(__dirname, "../../../../backend/src/services/Shelf/node_index.json");
const BACKEND_SERVICE_FILE = path.resolve(__dirname, "../../../../backend/src/services/Shelf/service.ts");
const GLOBAL_WORKFLOWS_CACHE = path.resolve(__dirname, "../../../globalPretzelWorkflows.json");
const DEV_USER_ID = "9a0a1560-ac61-4ce8-a468-3f717588d838";
function mergeFieldsById(baseFields, dependencyFields) {
    const fieldsById = new Map();
    for (const field of baseFields)
        fieldsById.set(field.id, field);
    for (const field of dependencyFields)
        if (!fieldsById.has(field.id))
            fieldsById.set(field.id, field);
    return [...fieldsById.values()];
}
async function traverseDir(dir, callback) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
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
const db_pretzel_blueprints = {};
async function generateIndex(includeDbBlueprints = false) {
    const blueprints = {};
    const drawers = {};
    await traverseDir(NODES_ROOT, async (filePath) => {
        if (!filePath.endsWith("blueprint.ts"))
            return;
        const module = await Promise.resolve(`${filePath}`).then(s => __importStar(require(s)));
        const blueprint = domain_1.Foundations.Blueprint.Schema.parse(module.Blueprint);
        blueprints[blueprint.id] = blueprint;
    });
    const index = {
        version: Date.now().toString(),
        generatedAt: new Date().toISOString(),
        drawers,
        blueprints,
    };
    if (includeDbBlueprints) {
        // Direct pg rather than PostgREST — the Supabase Data API is disabled. The APP
        // connection (RLS-constrained, not the owner) is deliberate: these workflows are
        // is_public, and the workflows SELECT policy's `OR is_public = true` branch makes them
        // readable without any owner bypass. Reading public data needs no elevated role.
        const pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
        let data;
        try {
            const result = await pool.query(`select id, display_name, description, icon, accent, data
                 from workflows where user_id = $1 and is_public = true`, [DEV_USER_ID]);
            data = result.rows;
        }
        finally {
            await pool.end();
        }
        const baseBlueprint = (0, lodash_1.cloneDeep)(blueprints["Core.SubWorkflow.Execute"]);
        for (const row of data ?? []) {
            const workflowData = row.data;
            const dependencyFields = workflowData.fields ?? [];
            // pg returns id as a plain string; brand it once for the keyed lookups below.
            const workflowId = row.id;
            let inputs = [];
            let outputs = [];
            try {
                ({ inputs, outputs } = (0, subworkflow_1.extractExposedPorts)(workflowData));
            }
            catch (err) {
                console.error(`Error processing public workflow ${row.display_name} ${row.id}:`, err);
                continue;
            }
            const blueprintId = publicWorkflows_1.PUBLIC_WORKFLOW_BLUEPRINTS_REVERSE[workflowId];
            const bp = {
                ...baseBlueprint,
                id: blueprintId,
                ui: {
                    displayName: row.display_name,
                    description: row.description ?? undefined,
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
                dependencyRef: { workflowId, mode: "publication" },
            };
            console.log(`Processing public workflow: ${bp.id} (${bp.dependencyRef?.workflowId}) with ${inputs.length} inputs, ${outputs.length} outputs, and ${dependencyFields.length} dependency fields`);
            db_pretzel_blueprints[blueprintId] = bp;
        }
        index.blueprints = {
            ...index.blueprints,
            ...db_pretzel_blueprints,
        };
        console.log(`Fetched ${Object.keys(db_pretzel_blueprints).length} public blueprints from DB`);
        fs.writeFileSync(GLOBAL_WORKFLOWS_CACHE, JSON.stringify(db_pretzel_blueprints, null, 2));
        console.log(`Cached global workflow blueprints to ${GLOBAL_WORKFLOWS_CACHE}`);
    }
    else if (fs.existsSync(GLOBAL_WORKFLOWS_CACHE)) {
        const cached = JSON.parse(fs.readFileSync(GLOBAL_WORKFLOWS_CACHE, 'utf-8'));
        index.blueprints = { ...index.blueprints, ...cached };
        console.log(`Merged ${Object.keys(cached).length} cached global workflow blueprints`);
    }
    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(index, null, 2));
    console.log(`Successfully indexed ${Object.keys(blueprints).length} nodes in ${Object.keys(drawers).length} drawers`);
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
    });
}
