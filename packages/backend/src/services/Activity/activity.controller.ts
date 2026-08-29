import { Controller, Post, UseGuards, HttpCode } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { MemberAuthGuard } from '../../auth/member-auth.guard';
import { AuthenticatedUser } from '@/decorators/principal';
import { Principal } from '@/domain/Principal';

@Controller('activity')
@UseGuards(MemberAuthGuard)
export class ActivityController {
    constructor(private readonly activityService: ActivityService) { }

    @Post('bootstrap')
    @HttpCode(200)
    async bootstrap(@AuthenticatedUser() principal: Principal.User) {
        return await this.activityService.bootstrap(principal);
    }
}
