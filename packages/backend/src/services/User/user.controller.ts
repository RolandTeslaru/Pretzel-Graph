import { Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { MemberAuthGuard } from '../../auth/member-auth.guard';
import { AuthenticatedUser } from '@/decorators/principal';
import { Principal } from '@/domain/Principal';
import { Auth } from '@pretzel-graph/shared/domain';
import { ZodBody } from '@pretzel-graph/shared/server/pipes/zod.pipe';

@Controller('auth')
export class UserController {
    constructor(private readonly users: UserService) {}

    // No guard: asked before anyone can be authenticated.
    @Get('status')
    async getStatus() {
        return await this.users.getStatus();
    }

    @Get('me')
    @UseGuards(MemberAuthGuard)
    async getMe(@AuthenticatedUser() principal: Principal.User) {
        return await this.users.getMe(principal);
    }

    @Patch('me')
    @UseGuards(MemberAuthGuard)
    async updateMe(
        @AuthenticatedUser() principal: Principal.User,
        @ZodBody(Auth.API.Me.Update.Request) body: Auth.API.Me.Update.Request,
    ) {
        return await this.users.updateMe(principal, body);
    }
}
