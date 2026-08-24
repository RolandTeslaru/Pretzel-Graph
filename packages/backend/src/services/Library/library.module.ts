import { Module } from '@nestjs/common';
import { LibraryController } from './library.controller';
import { LibraryService } from './library.service';
import { LibraryDatabase } from './library.database';
import { ListingModule } from '../Listing/listing.module';

@Module({
    imports: [ListingModule],
    controllers: [LibraryController],
    providers: [LibraryService, LibraryDatabase],
})
export class LibraryModule { }
