import { Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserAuthGuard } from '../../auth/user-auth.guard';
import { AuthenticatedUser } from '@/decorators/principal';
import { Principal } from '@/domain/Principal';
import { Auth } from '@pretzel-graph/shared/domain';
import { ZodBody } from '@/pipes/zod.pipe';

@Controller('auth')
@UseGuards(UserAuthGuard)
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Get('me')
    async getMe(@AuthenticatedUser() principal: Principal.User) {
        return await this.authService.getMe(principal);
    }

    @Patch('me')
    async updateMe(
        @AuthenticatedUser() principal: Principal.User,
        @ZodBody(Auth.API.Me.Update.Request) body: Auth.API.Me.Update.Request,
    ) {
        return await this.authService.updateMe(principal, body);
    }
}
