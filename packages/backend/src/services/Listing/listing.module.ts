import { Module } from '@nestjs/common';
import { ListingService } from './listing.service';
import { ListingRegistry } from './registry.client';
import { LibraryDatabase } from '../Library/library.database';
import { VersionControlDatabase } from '../VersionControl/version-control.database';

@Module({
    providers: [ListingService, ListingRegistry, LibraryDatabase, VersionControlDatabase],
    exports: [ListingService],
})
export class ListingModule {}
