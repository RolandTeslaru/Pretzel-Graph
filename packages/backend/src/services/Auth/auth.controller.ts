import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserAuthGuard } from '../../auth/user-auth.guard';
import { CurrentUser } from '@/decorators/principal';
import { Principal } from '@/domain/Principal';

@Controller('auth')
@UseGuards(UserAuthGuard)
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Get('me')
    async getMe(@CurrentUser() principal: Principal.User) {
        return await this.authService.getMe(principal);
    }
}
