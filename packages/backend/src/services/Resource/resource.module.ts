import { Module } from '@nestjs/common';
import { ResourceController } from './resource.controller';
import { ResourceService } from './resource.service';
import { WorkbenchModule } from '../Workbench/workbench.module';
import { ListingModule } from '../Listing/listing.module';
import { LibraryModule } from '../Library/library.module';
import { VersionControlModule } from '../VersionControl/version-control.module';

@Module({
    imports: [WorkbenchModule, ListingModule, LibraryModule, VersionControlModule],
    controllers: [ResourceController],
    providers: [ResourceService],
})
export class ResourceModule { }
