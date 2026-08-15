import { Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { MemberAuthGuard } from '../../auth/member-auth.guard';
import { AuthenticatedUser } from '@/decorators/principal';
import { Principal } from '@/domain/Principal';
import { Auth } from '@pretzel-graph/shared/domain';
import { ZodBody } from '@pretzel-graph/shared/server/pipes/zod.pipe';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    // No guard: asked before anyone can be authenticated.
    @Get('status')
    async getStatus() {
        return await this.authService.getStatus();
    }

    @Get('me')
    @UseGuards(MemberAuthGuard)
    async getMe(@AuthenticatedUser() principal: Principal.User) {
        return await this.authService.getMe(principal);
    }

    @Patch('me')
    @UseGuards(MemberAuthGuard)
    async updateMe(
        @AuthenticatedUser() principal: Principal.User,
        @ZodBody(Auth.API.Me.Update.Request) body: Auth.API.Me.Update.Request,
    ) {
        return await this.authService.updateMe(principal, body);
    }
}
