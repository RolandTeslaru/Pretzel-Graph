import { Controller, Get, UseGuards } from '@nestjs/common';
import { Release } from '@pretzel-graph/shared/domain';
import { MemberAuthGuard } from '../../auth/member-auth.guard';
import { MinRole } from '../../auth/min-role.decorator';
import { RELEASE } from '@/utils/release';
import { ReleaseService } from './release.service';

@Controller('release')
@UseGuards(MemberAuthGuard)
export class ReleaseController {

    constructor(private readonly service: ReleaseService) {}

    @Get('update')
    @MinRole('admin')
    public async getUpdate(): Promise<Release.API.Update.Response> {
        return { current: RELEASE, available: await this.service.getAvailableUpdate() };
    }
}
