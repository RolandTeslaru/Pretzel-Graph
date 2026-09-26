import { Controller, Post, UseGuards, HttpCode } from '@nestjs/common';
import { Library } from '@pretzel-graph/shared/domain';
import { ZodBody } from '@pretzel-graph/shared/server/pipes/zod.pipe';
import { DelegateAuthGuard } from '@/auth/delegate-auth.guard';
import { AuthenticatedDelegate } from '@/decorators/principal';
import { Principal } from '@/domain/Principal';
import { LibraryRepository } from './repository';

// The library as a run sees it: every item's summary, searchable, never a graph or skill body.
@Controller('internal/library')
@UseGuards(DelegateAuthGuard)
export class InternalLibraryController {
    constructor(private readonly libraryRepository: LibraryRepository) {}

    @Post('items/query')
    @HttpCode(200)
    queryItems(
        @AuthenticatedDelegate() delegate: Principal.Delegate,
        @ZodBody(Library.API.Internal.Query.Request) body: Library.API.Internal.Query.Request,
    ): Promise<Library.API.Internal.Query.Response> {
        return this.libraryRepository.search.query(delegate, body);
    }
}
