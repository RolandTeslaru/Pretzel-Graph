import { Controller, UseGuards } from '@nestjs/common';
import { WorkbenchService } from './workbench.service';
import { SupabaseAuthGuard } from '../../auth/supabase-auth.guard';

@Controller('workbench')
@UseGuards(SupabaseAuthGuard)
export class WorkbenchController {
    constructor(private readonly workbenchService: WorkbenchService) { }
}
