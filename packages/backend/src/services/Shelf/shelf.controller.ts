import { Controller, Post, UseGuards, HttpCode } from '@nestjs/common';
import { ShelfService } from './shelf.service';
import { Shelf } from '@pretzel-graph/shared/domain';
import { MemberAuthGuard } from '../../auth/member-auth.guard';
import { ZodBody } from '@pretzel-graph/shared/server/pipes/zod.pipe';

@Controller('shelf')
@UseGuards(MemberAuthGuard)
export class ShelfController {
    constructor(private readonly shelfService: ShelfService) { }

    @Post('blueprint/get')
    @HttpCode(200)
    getBlueprint(
        @ZodBody(Shelf.API.Blueprint.Get.Request) body: Shelf.API.Blueprint.Get.Request,
    ) {
        return this.shelfService.getBlueprint(body);
    }

    @Post('blueprint/getBatch')
    @HttpCode(200)
    async getBatchBlueprints(
        @ZodBody(Shelf.API.Blueprint.GetBatch.Request) body: Shelf.API.Blueprint.GetBatch.Request,
    ) {
        return await this.shelfService.getBatchBlueprints(body);
    }

    @Post('blueprint/getAllInSection')
    @HttpCode(200)
    getAllInSection(
        @ZodBody(Shelf.API.Blueprint.GetAllInSection.Request) body: Shelf.API.Blueprint.GetAllInSection.Request,
    ) {
        return this.shelfService.getAllInSection(body);
    }

    @Post('blueprint/derive')
    @HttpCode(200)
    deriveBlueprint(
        @ZodBody(Shelf.API.Blueprint.Derive.Request) body: Shelf.API.Blueprint.Derive.Request,
    ) {
        return this.shelfService.deriveBlueprint(body);
    }
}
