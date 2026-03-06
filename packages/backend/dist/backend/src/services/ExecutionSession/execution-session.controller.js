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
exports.ExecutionSessionController = void 0;
const common_1 = require("@nestjs/common");
const execution_session_service_1 = require("./execution-session.service");
const domain_1 = require("@vx-agent-editor/shared/domain");
const supabase_auth_guard_1 = require("../../auth/supabase-auth.guard");
let ExecutionSessionController = class ExecutionSessionController {
    constructor(executionSessionService) {
        this.executionSessionService = executionSessionService;
    }
    async create(req, body) {
        const payload = domain_1.ExecutionSession.API.Create.Request.parse(body);
        return await this.executionSessionService.create(req.token, payload);
    }
    async get(req, body) {
        const payload = domain_1.ExecutionSession.API.Get.Request.parse(body);
        return await this.executionSessionService.get(req.token, payload);
    }
    async update(req, body) {
        const payload = domain_1.ExecutionSession.API.Update.Request.parse(body);
        return await this.executionSessionService.update(req.token, payload);
    }
};
exports.ExecutionSessionController = ExecutionSessionController;
__decorate([
    (0, common_1.Post)('create'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ExecutionSessionController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('get'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ExecutionSessionController.prototype, "get", null);
__decorate([
    (0, common_1.Post)('update'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ExecutionSessionController.prototype, "update", null);
exports.ExecutionSessionController = ExecutionSessionController = __decorate([
    (0, common_1.Controller)('execution-session'),
    (0, common_1.UseGuards)(supabase_auth_guard_1.SupabaseAuthGuard),
    __metadata("design:paramtypes", [execution_session_service_1.ExecutionSessionService])
], ExecutionSessionController);
