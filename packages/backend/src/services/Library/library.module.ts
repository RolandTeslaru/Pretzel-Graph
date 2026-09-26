import { Module } from '@nestjs/common';
import { LibraryController } from './library.controller';
import { InternalLibraryController } from './internal-library.controller';
import { LibraryService } from './library.service';
import { LibraryRepository } from './repository';
import { ListingModule } from '../Listing/listing.module';

@Module({
    imports: [ListingModule],
    controllers: [LibraryController, InternalLibraryController],
    providers: [LibraryService, LibraryRepository],
    exports: [LibraryRepository],
})
export class LibraryModule { }
