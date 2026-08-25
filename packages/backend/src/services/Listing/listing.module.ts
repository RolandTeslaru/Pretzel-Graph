import { Module } from '@nestjs/common';
import { CloudModule } from '../Cloud/cloud.module';
import { ListingService } from './listing.service';
import { ListingRegistry } from './registry.client';
import { LibraryDatabase } from '../Library/library.database';
import { VersionControlDatabase } from '../VersionControl/version-control.database';

@Module({
    imports: [CloudModule],
    providers: [ListingService, ListingRegistry, LibraryDatabase, VersionControlDatabase],
    exports: [ListingService],
})
export class ListingModule {}
