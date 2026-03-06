"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkbenchService = void 0;
const common_1 = require("@nestjs/common");
const vx_aggex_1 = require("@vx-agent-builder/vx-aggex");
let WorkbenchService = class WorkbenchService {
    async reconcileField(payload) {
        const { fieldId, blueprintId, newValue } = payload;
        const reconcileFn = await vx_aggex_1.CatalogueService.getReconciler(blueprintId);
        if (!reconcileFn)
            throw new Error(`Reconciler for node ${blueprintId} not found`);
        const reconciledBlueprint = reconcileFn(fieldId, newValue);
        return { reconciledBlueprint };
    }
};
exports.WorkbenchService = WorkbenchService;
exports.WorkbenchService = WorkbenchService = __decorate([
    (0, common_1.Injectable)()
], WorkbenchService);
