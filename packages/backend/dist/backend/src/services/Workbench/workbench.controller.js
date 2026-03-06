"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkbenchController = void 0;
const common_1 = require("@nestjs/common");
const workbench_service_1 = require("./workbench.service");
const domain_1 = require("@vx-agent-editor/shared/domain");
const supabase_auth_guard_1 = require("../../auth/supabase-auth.guard");
let WorkbenchController = class WorkbenchController {
    constructor(workbenchService) {
        this.workbenchService = workbenchService;
    }
    async reconcileField(body) {
        const payload = domain_1.Workbench.API.Field.Reconcile.Request.parse(body);
        return await this.workbenchService.reconcileField(payload);
    }
};
exports.WorkbenchController = WorkbenchController;
__decorate([
    (0, common_1.Post)('field/reconcile'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WorkbenchController.prototype, "reconcileField", null);
exports.WorkbenchController = WorkbenchController = __decorate([
    (0, common_1.Controller)('workbench'),
    (0, common_1.UseGuards)(supabase_auth_guard_1.SupabaseAuthGuard),
    __metadata("design:paramtypes", [workbench_service_1.WorkbenchService])
], WorkbenchController);
