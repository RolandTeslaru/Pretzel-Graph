"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const supabase_1 = require("../utils/supabase");
let SupabaseAuthGuard = class SupabaseAuthGuard {
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const token = this.extractTokenFromHeader(request);
        if (!token) {
            throw new common_1.UnauthorizedException('No token provided');
        }
        // Allow service_role key (used by vx-aggex worker for server-to-server calls)
        // The Supabase service_role key is a JWT with role: "service_role" in its payload
        try {
            const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
            if (payload.role === 'service_role') {
                request.user = { id: 'service-role' };
                request.token = token;
                return true;
            }
        }
        catch { /* not a valid JWT format, continue to normal auth */ }
        try {
            const supabase = (0, supabase_1.createAuthenticatedClient)(token);
            const userId = await (0, supabase_1.getUserId)(supabase);
            if (!userId) {
                throw new common_1.UnauthorizedException('Invalid token');
            }
            // Attach user and token to the request object
            request.user = { id: userId };
            request.token = token;
            return true;
        }
        catch (error) {
            throw new common_1.UnauthorizedException();
        }
    }
    extractTokenFromHeader(request) {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : undefined;
    }
};
exports.SupabaseAuthGuard = SupabaseAuthGuard;
exports.SupabaseAuthGuard = SupabaseAuthGuard = __decorate([
    (0, common_1.Injectable)()
], SupabaseAuthGuard);
