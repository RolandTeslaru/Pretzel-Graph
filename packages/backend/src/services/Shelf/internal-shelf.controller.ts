import { Controller, Get, Post, Param, UseGuards, HttpCode } from '@nestjs/common';
import { Foundations, Shelf } from '@pretzel-graph/shared/domain';
import { ZodBody } from '@pretzel-graph/shared/server/pipes/zod.pipe';
import { DelegateAuthGuard } from '@/auth/delegate-auth.guard';
import { ShelfService } from './shelf.service';

// The shelf as a run sees it: the same catalogue the editor shows, searchable.
@Controller('internal/shelf')
@UseGuards(DelegateAuthGuard)
export class InternalShelfController {
    constructor(private readonly shelfService: ShelfService) {}

    @Post('blueprints/query')
    @HttpCode(200)
    query(
        @ZodBody(Shelf.API.Internal.Query.Request) body: Shelf.API.Internal.Query.Request,
    ): Promise<Shelf.API.Internal.Query.Response> {
        return this.shelfService.queryBlueprints(body);
    }

    @Get('blueprints/:id')
    get(
        @Param('id') id: Foundations.Blueprint.Id,
    ): Shelf.API.Blueprint.Get.Response {
        return this.shelfService.getBlueprint({ blueprintId: id });
    }
}
