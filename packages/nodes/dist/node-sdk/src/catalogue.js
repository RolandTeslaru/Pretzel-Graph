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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
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
var CatalogueServiceImpl_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CatalogueService = void 0;
exports.RegisterNode = RegisterNode;
const tsyringe_1 = require("tsyringe");
const Blueprint_1 = require("../../shared/domain/Foundations/Blueprint");
const publicWorkflows_1 = require("../../shared/constants/publicWorkflows");
let CatalogueServiceImpl = class CatalogueServiceImpl {
    static { CatalogueServiceImpl_1 = this; }
    static registry = new Map();
    __registry = CatalogueServiceImpl_1.registry;
    static register(blueprintId, constructor) {
        if (this.registry.has(blueprintId))
            console.warn(`[NodeRegistry] Overwriting node type: ${blueprintId}`);
        this.registry.set(blueprintId, constructor);
    }
    nodesRoot = "";
    // Base + resolved derivative blueprints share one cache. ReconciledId remains the persisted
    // workflow brand, but every non-base cache key is now a derivative path.
    blueprintCache = new Map();
    setNodesRoot(rootPath) {
        this.nodesRoot = rootPath;
    }
    async getNodeConstructor(blueprintId) {
        if (this.__registry.has(blueprintId))
            return this.__registry.get(blueprintId);
        if (!this.nodesRoot)
            throw new Error(`[CatalogueService] nodesRoot not set. Call setNodesRoot() before loading nodes.`);
        const relativePath = blueprintId.replace(/\./g, "/");
        const fullPath = `${this.nodesRoot}/${relativePath}/node`;
        try {
            const module = await Promise.resolve(`${fullPath}`).then(s => __importStar(require(s)));
            // An explicit @RegisterNode wins; otherwise fall back to the exported Node class,
            // mirroring how loadBaseBlueprint reads the sibling module's Blueprint export.
            if (this.__registry.has(blueprintId))
                return this.__registry.get(blueprintId);
            const NodeClass = (module.Node ?? null);
            if (!NodeClass)
                throw new Error(`Module loaded from ${relativePath} does not export a 'Node' class.`);
            CatalogueServiceImpl_1.register(blueprintId, NodeClass);
            return NodeClass;
        }
        catch (error) {
            console.error(`[CatalogueService] Failed to load node '${blueprintId}':`, error);
            return null;
        }
    }
    async loadBaseBlueprint(blueprintId) {
        const cached = this.blueprintCache.get(blueprintId);
        if (cached)
            return cached;
        if (!this.nodesRoot)
            throw new Error(`[CatalogueService] nodesRoot not set. Call setNodesRoot() before loading blueprints.`);
        const relativePath = blueprintId.replace(/\./g, "/");
        const fullPath = `${this.nodesRoot}/${relativePath}/blueprint`;
        try {
            const module = await Promise.resolve(`${fullPath}`).then(s => __importStar(require(s)));
            const blueprint = (module.Blueprint ?? null);
            if (blueprint)
                this.blueprintCache.set(blueprintId, blueprint);
            return blueprint;
        }
        catch (error) {
            console.error(`[CatalogueService] Failed to load blueprint '${blueprintId}':`, error);
            return null;
        }
    }
    // Resolve a blueprint's derivative for the supplied field values. Static blueprints return
    // their base unchanged; there is no dynamic module or mutation fallback.
    async resolveBlueprint(baseBlueprintId, fieldValues) {
        // Get the Base first
        const base = await this.loadBaseBlueprint(baseBlueprintId);
        if (!base)
            return null;
        if (!base._derivatives?.length)
            return base;
        // Derive and check cache
        const derivedBlueprintId = Blueprint_1.Blueprint.deriveId(base, fieldValues);
        const cached = this.blueprintCache.get(derivedBlueprintId);
        if (cached)
            return cached;
        const { blueprint } = Blueprint_1.Blueprint.derive(base, fieldValues);
        this.blueprintCache.set(derivedBlueprintId, blueprint);
        return blueprint;
    }
    // Sync cache read for the hot path — the compiler warms the cache (loadBaseBlueprint/
    // resolveBlueprint) during prepareNode, so execution-time lookups never hit the async import.
    getBlueprint(id) {
        let bp = this.blueprintCache.get(id);
        if (!bp && id in publicWorkflows_1.PUBLIC_WORKFLOW_BLUEPRINTS)
            return this.blueprintCache.get("Core.SubWorkflow.Execute");
        return bp;
    }
    // To be deleted
    registerBlueprint(id, blueprint) {
        this.blueprintCache.set(id, blueprint);
    }
    async getLoader(blueprintId, loaderId) {
        const NodeClass = await this.getNodeConstructor(blueprintId);
        if (!NodeClass)
            return null;
        return NodeClass.loaders?.[loaderId] ?? null;
    }
    getNodeDependency(wfNode, wfData) {
        if (!wfNode.dependencyRef)
            return null;
        const { workflowId, mode } = wfNode.dependencyRef;
        const store = mode === "publication"
            ? wfData.dependencies?.published
            : wfData.dependencies?.draft;
        if (!store?.[workflowId])
            throw new Error(`Node ${wfNode.id} has a dependency (${workflowId}) but its not in the store`);
        return store[workflowId];
    }
    async resolveWorkflowNode(wfNode, staticValues, wfData) {
        const depedency = this.getNodeDependency(wfNode, wfData);
        // Case without dependency
        if (!depedency) {
            const RuntimeNode = await this.getNodeConstructor(wfNode.blueprintId);
            const blueprint = await this.resolveBlueprint(wfNode.blueprintId, staticValues);
            if (!RuntimeNode)
                throw new Error(`Could not get the RuntimeNode constructor for ${wfNode.blueprintId}`);
            if (!blueprint)
                throw new Error(`Could not get the resolved blueprint for ${wfNode.blueprintId} for node ${wfNode.id}`);
            return { RuntimeNode, blueprint };
        }
        const executeId = "Core.SubWorkflow.Execute";
        const RuntimeNode = await this.getNodeConstructor(executeId);
        const blueprint = await this.loadBaseBlueprint(executeId);
        if (!RuntimeNode || !blueprint)
            throw new Error(`Could not resolve node ${wfNode.id} with dependency ${depedency.workflow_id}. Core.SubWorkflow.Execute node not found in the catalogue`);
        return { RuntimeNode, blueprint };
    }
};
CatalogueServiceImpl = CatalogueServiceImpl_1 = __decorate([
    (0, tsyringe_1.singleton)()
], CatalogueServiceImpl);
exports.CatalogueService = tsyringe_1.container.resolve(CatalogueServiceImpl);
function RegisterNode(blueprintId) {
    return function (constructor) {
        CatalogueServiceImpl.register(blueprintId, constructor);
    };
}
