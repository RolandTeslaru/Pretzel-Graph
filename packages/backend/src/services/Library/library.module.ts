import { Module } from '@nestjs/common';
import { LibraryController } from './library.controller';
import { LibraryService } from './library.service';
import { LibraryRepository } from './library.repository';
import { ListingModule } from '../Listing/listing.module';

@Module({
    imports: [ListingModule],
    controllers: [LibraryController],
    providers: [LibraryService, LibraryRepository],
})
export class LibraryModule { }
