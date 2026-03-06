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
exports.OrchestratorController = void 0;
const common_1 = require("@nestjs/common");
const orchestrator_service_1 = require("./orchestrator.service");
const domain_1 = require("@vx-agent-editor/shared/domain");
const supabase_auth_guard_1 = require("../../auth/supabase-auth.guard");
let OrchestratorController = class OrchestratorController {
    constructor(orchestratorService) {
        this.orchestratorService = orchestratorService;
    }
    async run(req, body) {
        const payload = domain_1.Orchestrator.API.Run.Request.parse(body);
        return await this.orchestratorService.run(req.token, payload);
    }
    async pause(req, body) {
        const payload = domain_1.Orchestrator.API.Pause.Request.parse(body);
        return await this.orchestratorService.pause(req.token, payload);
    }
    async terminate(req, body) {
        const payload = domain_1.Orchestrator.API.Terminate.Request.parse(body);
        return await this.orchestratorService.terminate(req.token, payload);
    }
    async finalise(req, body) {
        const payload = domain_1.Orchestrator.API.Finalise.Request.parse(body);
        return await this.orchestratorService.finalise(req.token, payload);
    }
};
exports.OrchestratorController = OrchestratorController;
__decorate([
    (0, common_1.Post)('run'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], OrchestratorController.prototype, "run", null);
__decorate([
    (0, common_1.Post)('pause'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], OrchestratorController.prototype, "pause", null);
__decorate([
    (0, common_1.Post)('terminate'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], OrchestratorController.prototype, "terminate", null);
__decorate([
    (0, common_1.Post)('finalise'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], OrchestratorController.prototype, "finalise", null);
exports.OrchestratorController = OrchestratorController = __decorate([
    (0, common_1.Controller)('orchestrator'),
    (0, common_1.UseGuards)(supabase_auth_guard_1.SupabaseAuthGuard),
    __metadata("design:paramtypes", [orchestrator_service_1.OrchestratorService])
], OrchestratorController);
