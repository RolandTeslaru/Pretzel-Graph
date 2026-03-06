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
exports.ChatController = void 0;
const common_1 = require("@nestjs/common");
const chat_service_1 = require("./chat.service");
const domain_1 = require("@vx-agent-editor/shared/domain");
const supabase_auth_guard_1 = require("../../auth/supabase-auth.guard");
let ChatController = class ChatController {
    constructor(chatService) {
        this.chatService = chatService;
    }
    async create(req, body) {
        const payload = domain_1.Chat.API.Create.Request.parse(body);
        return await this.chatService.create(req.token, payload);
    }
    async get(req, body) {
        const payload = domain_1.Chat.API.Get.Request.parse(body);
        return await this.chatService.get(req.token, payload);
    }
    async list(req) {
        return await this.chatService.list(req.token);
    }
    async erase(req, body) {
        const payload = domain_1.Chat.API.Erase.Request.parse(body);
        return await this.chatService.erase(req.token, payload);
    }
    async sendMessage(req, body) {
        const payload = domain_1.Chat.API.Message.Send.Request.parse(body);
        return await this.chatService.message.send(req.token, payload);
    }
    async respondMessage(req, body) {
        const payload = domain_1.Chat.API.Message.Respond.Request.parse(body);
        return await this.chatService.message.respond(req.token, payload);
    }
    async eraseMessage(req, body) {
        const payload = domain_1.Chat.API.Message.Erase.Request.parse(body);
        return await this.chatService.message.erase(req.token, payload);
    }
    async updateMessage(req, body) {
        const payload = domain_1.Chat.API.Message.Update.Request.parse(body);
        return await this.chatService.message.update(req.token, payload);
    }
};
exports.ChatController = ChatController;
__decorate([
    (0, common_1.Post)('create'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('get'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "get", null);
__decorate([
    (0, common_1.Post)('list'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "list", null);
__decorate([
    (0, common_1.Post)('erase'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "erase", null);
__decorate([
    (0, common_1.Post)('message/send'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "sendMessage", null);
__decorate([
    (0, common_1.Post)('message/respond'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "respondMessage", null);
__decorate([
    (0, common_1.Post)('message/erase'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "eraseMessage", null);
__decorate([
    (0, common_1.Post)('message/update'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "updateMessage", null);
exports.ChatController = ChatController = __decorate([
    (0, common_1.Controller)('chat'),
    (0, common_1.UseGuards)(supabase_auth_guard_1.SupabaseAuthGuard),
    __metadata("design:paramtypes", [chat_service_1.ChatService])
], ChatController);
