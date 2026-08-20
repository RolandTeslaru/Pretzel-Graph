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
exports.Workflow = void 0;
const zod_1 = require("zod");
const NodeMod = __importStar(require("./node"));
const EdgeMod = __importStar(require("./edge"));
const DataMod = __importStar(require("./data"));
const DepMod = __importStar(require("./dependency"));
const CacheMod = __importStar(require("./cache"));
const RepairMod = __importStar(require("./repair"));
const ids_1 = require("./ids");
const migrate_1 = require("./migrate");
const resolvers_1 = require("./resolvers");
var Workflow;
(function (Workflow) {
    Workflow.Id = ids_1.WorkflowId;
    /** Dummy node ID used as the staticValues key for workflow-level config fields. */
    Workflow.WORKFLOW_CONFIG_NODE_ID = "__workflow_config__";
    function createId() {
        return crypto.randomUUID();
    }
    Workflow.createId = createId;
    Workflow.DEFAULT_ICON = "graph";
    Workflow.DEFAULT_ACCENT = "utility";
    // Re-export the sub-module namespaces. `export import` carries the value,
    // the type, and nested members (e.g. Node.Id as both value and type).
    Workflow.Node = NodeMod.Node;
    Workflow.Edge = EdgeMod.Edge;
    Workflow.Data = DataMod.Data;
    Workflow.Layout = DataMod.Data.Layout;
    Workflow.Viewport = DataMod.Data.Viewport;
    Workflow.Dependency = DepMod.Dependency;
    Workflow.Cache = CacheMod.Cache;
    Workflow.Repair = RepairMod.Repair;
    Workflow.createCache = CacheMod.createCache;
    Workflow.resolveShape = CacheMod.resolveShape;
    Workflow.deriveArcs = CacheMod.deriveArcs;
    Workflow.deriveReversedArcs = CacheMod.deriveReversedArcs;
    // A subworkflow's exposed ports, read from its Expose*Port nodes. Impl in ./resolvers.
    Workflow.extractExposedInputs = resolvers_1.extractExposedInputs;
    Workflow.extractExposedOutputs = resolvers_1.extractExposedOutputs;
    Workflow.Schema = zod_1.z.object({
        id: ids_1.WorkflowId,
        display_name: zod_1.z.string(),
        locked: zod_1.z.boolean(),
        description: zod_1.z.string().optional().nullable(),
        icon: zod_1.z.string().nullable().optional(),
        accent: zod_1.z.string().nullable().optional(),
        icon_color: zod_1.z.string().nullable().optional(),
        created_at: zod_1.z.coerce.date(),
        updated_at: zod_1.z.coerce.date(),
        folder_id: ids_1.FolderId,
        data: Workflow.Data.Schema
    });
    Workflow.INITIAL = {
        id: "",
        locked: false,
        display_name: "",
        description: "",
        icon: null,
        accent: null,
        icon_color: null,
        folder_id: "",
        created_at: new Date(),
        updated_at: new Date(),
        data: {
            version: migrate_1.WORKFLOW_DATA_VERSION,
            fields: [],
            nodes: {},
            edges: [],
            staticValues: {},
            fieldExpressions: {},
            credentialInstanceIds: {},
            dependencies: { published: {}, draft: {} },
            ui: {
                layout: {},
                viewport: { x: 0, y: 0, zoom: 1 },
                icon_color: null,
            }
        }
    };
})(Workflow || (exports.Workflow = Workflow = {}));
