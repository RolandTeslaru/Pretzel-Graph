import { Controller, Post, Body, UseGuards, HttpCode } from '@nestjs/common';
import { WorkbenchService } from './workbench.service';
import { Workbench } from '@vx-agent-editor/shared/domain';
import { SupabaseAuthGuard } from '../../auth/supabase-auth.guard';

@Controller('workbench')
@UseGuards(SupabaseAuthGuard)
export class WorkbenchController {
    constructor(private readonly workbenchService: WorkbenchService) { }

    @Post('field/reconcile')
    @HttpCode(200)
    async reconcileField(
        @Body() body: any
    ) {
        const payload = Workbench.API.Field.Reconcile.Request.parse(body);
        return await this.workbenchService.reconcileField(payload);
    }
}
