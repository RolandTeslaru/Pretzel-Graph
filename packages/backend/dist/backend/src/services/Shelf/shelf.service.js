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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShelfService = void 0;
const common_1 = require("@nestjs/common");
const indexJson = __importStar(require("./node_index.json"));
const drawers_1 = require("@vx-agent-editor/shared/constants/drawers");
const INDEX = indexJson;
let ShelfService = class ShelfService {
    getBlueprint(payload) {
        const { blueprintId } = payload;
        const blueprint = INDEX.blueprints[blueprintId];
        if (!blueprint)
            throw new Error(`Blueprint not found: ${blueprintId}`);
        return { blueprint };
    }
    getBatchBlueprints(payload) {
        const { blueprintIds } = payload;
        const blueprints = {};
        blueprintIds.forEach(blueprintId => {
            const blueprint = INDEX.blueprints[blueprintId];
            if (blueprint)
                blueprints[blueprintId] = blueprint;
        });
        return { blueprints };
    }
    getAllInSection(payload) {
        const { section } = payload;
        // @ts-expect-error
        const drawerIds = drawers_1.SECTIONS[section];
        const blueprints = {};
        drawerIds.forEach(drawerId => {
            const drawer = drawers_1.ALL_DRAWERS[drawerId];
            if (!drawer)
                return;
            drawer.blueprintIds.forEach(blueprintId => {
                const blueprint = INDEX.blueprints[blueprintId];
                if (blueprint)
                    blueprints[blueprintId] = blueprint;
            });
        });
        return { blueprints };
    }
};
exports.ShelfService = ShelfService;
exports.ShelfService = ShelfService = __decorate([
    (0, common_1.Injectable)()
], ShelfService);
