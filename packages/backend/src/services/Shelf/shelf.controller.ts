import { Controller, Post, Body, UseGuards, HttpCode } from '@nestjs/common';
import { ShelfService } from './shelf.service';
import { Shelf } from '@vx-agent-editor/shared/domain';
import { SupabaseAuthGuard } from '../../auth/supabase-auth.guard';

@Controller('shelf')
@UseGuards(SupabaseAuthGuard)
export class ShelfController {
    constructor(private readonly shelfService: ShelfService) { }

    @Post('blueprint/get')
    @HttpCode(200)
    getBlueprint(
        @Body() body: any
    ) {
        const payload = Shelf.API.Blueprint.Get.Request.parse(body);
        return this.shelfService.getBlueprint(payload);
    }


    @Post('blueprint/getBatch')
    @HttpCode(200)
    getBatchBlueprints(
        @Body() body: any
    ) {
        const payload = Shelf.API.Blueprint.GetBatch.Request.parse(body);
        return this.shelfService.getBatchBlueprints(payload);
    }


    @Post('blueprint/getAllInSection')
    @HttpCode(200)
    getAllInSection(
        @Body() body: any
    ) {
        const payload = Shelf.API.Blueprint.GetAllInSection.Request.parse(body);
        return this.shelfService.getAllInSection(payload);
    }

    @Post('blueprint/reconcile')
    @HttpCode(200)
    async reconcileBlueprint(
        @Body() body: any
    ) {
        const payload = Shelf.API.Blueprint.Reconcile.Request.parse(body);
        return await this.shelfService.reconcileBlueprint(payload);
    }
}
