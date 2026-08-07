import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SupabaseAuthGuard } from '../../auth/supabase-auth.guard';
import { CurrentUser } from '@/decorators/principal';
import { Principal } from '@/domain/Principal';

@Controller('auth')
@UseGuards(SupabaseAuthGuard)
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Get('me')
    async getMe(@CurrentUser() principal: Principal.User) {
        return await this.authService.getMe(principal);
    }
}
