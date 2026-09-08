import { Module } from '@nestjs/common';
import { CloudModule } from '../Cloud/cloud.module';
import { ListingService } from './listing.service';
import { ListingRegistry } from './registry.client';
import { VersionControlRepository } from '../VersionControl/version-control.repository';

@Module({
    imports: [CloudModule],
    providers: [ListingService, ListingRegistry, VersionControlRepository],
    exports: [ListingService],
})
export class ListingModule {}
