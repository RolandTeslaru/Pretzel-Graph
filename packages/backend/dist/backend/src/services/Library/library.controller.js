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
exports.LibraryController = void 0;
const common_1 = require("@nestjs/common");
const library_service_1 = require("./library.service");
const domain_1 = require("@vx-agent-editor/shared/domain");
const supabase_auth_guard_1 = require("../../auth/supabase-auth.guard");
let LibraryController = class LibraryController {
    constructor(libraryService) {
        this.libraryService = libraryService;
    }
    async createWorkflow(req, body) {
        const payload = domain_1.Library.API.Workflow.Create.Request.parse(body);
        return await this.libraryService.createWorkflow(req.token, payload);
    }
    async getWorkflow(req, id) {
        return await this.libraryService.getWorkflow(req.token, id);
    }
    async listWorkflows(req, folderId) {
        return await this.libraryService.listWorkflows(req.token, folderId);
    }
};
exports.LibraryController = LibraryController;
__decorate([
    (0, common_1.Post)('workflows'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], LibraryController.prototype, "createWorkflow", null);
__decorate([
    (0, common_1.Get)('workflows/:id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], LibraryController.prototype, "getWorkflow", null);
__decorate([
    (0, common_1.Get)('workflows'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('folderId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], LibraryController.prototype, "listWorkflows", null);
exports.LibraryController = LibraryController = __decorate([
    (0, common_1.Controller)('library'),
    (0, common_1.UseGuards)(supabase_auth_guard_1.SupabaseAuthGuard),
    __metadata("design:paramtypes", [library_service_1.LibraryService])
], LibraryController);
