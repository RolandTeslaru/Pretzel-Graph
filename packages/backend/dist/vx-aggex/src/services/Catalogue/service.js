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
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var CatalogueServiceImpl_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CatalogueService = void 0;
exports.RegisterNode = RegisterNode;
const path_1 = __importDefault(require("path"));
const tsyringe_1 = require("tsyringe");
let CatalogueServiceImpl = CatalogueServiceImpl_1 = class CatalogueServiceImpl {
    static register(blueprintId, constructor) {
        if (CatalogueServiceImpl_1.registry.has(blueprintId))
            console.warn(`[NodeRegistry] Overwriting node type: ${blueprintId}`);
        CatalogueServiceImpl_1.registry.set(blueprintId, constructor);
    }
    constructor() {
        this.__registry = CatalogueServiceImpl_1.registry;
        this.nodesRoot = path_1.default.resolve(__dirname, "../../nodes");
    }
    async getNode(blueprintId) {
        // 1. Check Memory Cache (Registry)
        if (this.__registry.has(blueprintId))
            return this.__registry.get(blueprintId);
        // 2. Convention over Configuration: Resolve Path
        // "Google.Chat.v1" -> "Google/Chat/v1"
        const relativePath = blueprintId.replace(/\./g, "/");
        const fullPath = path_1.default.join(this.nodesRoot, relativePath + "/node");
        try {
            await Promise.resolve(`${fullPath}`).then(s => __importStar(require(s)));
            // check registry after dynamic import
            if (this.__registry.has(blueprintId))
                return this.__registry.get(blueprintId);
            throw new Error(`Module loaded from ${relativePath} but it did not register '${blueprintId}'. Check the @RegisterNode decorator.`);
        }
        catch (error) {
            console.error(`[CatalogueService] Failed to load node '${blueprintId}':`, error);
            return null;
        }
    }
    async getReconciler(blueprintId) {
        // 1. Convention over Configuration: Resolve Path
        // "Google.Chat.v1" -> "Google/Chat/v1"
        const relativePath = blueprintId.replace(/\./g, "/");
        const fullPath = path_1.default.join(this.nodesRoot, relativePath + "/reconcile");
        const blueprintPath = path_1.default.join(this.nodesRoot, relativePath + "/blueprint");
        try {
            const module = await Promise.resolve(`${fullPath}`).then(s => __importStar(require(s)));
            // The imported module should export a function that accepts (fieldId, newValue)
            return module.reconcile || module.default;
        }
        catch (error) {
            // If reconcile.ts doesn't exist, try to load blueprint and return default Identity reconcile
            if (error.code === 'MODULE_NOT_FOUND') {
                try {
                    const bpModule = await Promise.resolve(`${blueprintPath}`).then(s => __importStar(require(s)));
                    const Blueprint = bpModule.Blueprint;
                    return (_changedFieldId, _newValue) => Blueprint; // Default identity: return static Blueprint
                }
                catch (bpError) {
                    console.error(`[CatalogueService] Failed to load blueprint for '${blueprintId}':`, bpError);
                    return null;
                }
            }
            console.error(`[CatalogueService] Failed to load reconcile for '${blueprintId}':`, error);
            return null;
        }
    }
};
// Seperete static and instance registry because i cannot use the instance registry in the static method Register
CatalogueServiceImpl.registry = new Map();
CatalogueServiceImpl = CatalogueServiceImpl_1 = __decorate([
    (0, tsyringe_1.singleton)(),
    __metadata("design:paramtypes", [])
], CatalogueServiceImpl);
exports.CatalogueService = tsyringe_1.container.resolve(CatalogueServiceImpl);
function RegisterNode(blueprintId) {
    return function (constructor) {
        CatalogueServiceImpl.register(blueprintId, constructor);
    };
}
