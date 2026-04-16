import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SupabaseAuthGuard, AuthenticatedRequest } from '../../auth/supabase-auth.guard';
import { Auth } from '@vx-agent-editor/shared/domain';

@Controller('auth')
@UseGuards(SupabaseAuthGuard)
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Get('me')
    async getMe(@Req() req: AuthenticatedRequest) {
        return await this.authService.getMe(req.token, req.user.id as Auth.User.Id);
    }
}
