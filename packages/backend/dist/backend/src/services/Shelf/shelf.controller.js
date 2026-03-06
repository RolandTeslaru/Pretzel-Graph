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
exports.ShelfController = void 0;
const common_1 = require("@nestjs/common");
const shelf_service_1 = require("./shelf.service");
const domain_1 = require("@vx-agent-editor/shared/domain");
const supabase_auth_guard_1 = require("../../auth/supabase-auth.guard");
let ShelfController = class ShelfController {
    constructor(shelfService) {
        this.shelfService = shelfService;
    }
    getBlueprint(body) {
        const payload = domain_1.Shelf.API.Blueprint.Get.Request.parse(body);
        return this.shelfService.getBlueprint(payload);
    }
    getBatchBlueprints(body) {
        const payload = domain_1.Shelf.API.Blueprint.GetBatch.Request.parse(body);
        return this.shelfService.getBatchBlueprints(payload);
    }
    getAllInSection(body) {
        const payload = domain_1.Shelf.API.Blueprint.GetAllInSection.Request.parse(body);
        return this.shelfService.getAllInSection(payload);
    }
};
exports.ShelfController = ShelfController;
__decorate([
    (0, common_1.Post)('blueprint/get'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ShelfController.prototype, "getBlueprint", null);
__decorate([
    (0, common_1.Post)('blueprint/getBatch'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ShelfController.prototype, "getBatchBlueprints", null);
__decorate([
    (0, common_1.Post)('blueprint/getAllInSection'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ShelfController.prototype, "getAllInSection", null);
exports.ShelfController = ShelfController = __decorate([
    (0, common_1.Controller)('shelf'),
    (0, common_1.UseGuards)(supabase_auth_guard_1.SupabaseAuthGuard),
    __metadata("design:paramtypes", [shelf_service_1.ShelfService])
], ShelfController);
