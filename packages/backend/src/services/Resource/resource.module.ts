import { Module } from '@nestjs/common';
import { ResourceController } from './resource.controller';
import { ResourceService } from './resource.service';
import { ResourceRepository } from './resource.repository';
import { WorkbenchModule } from '../Workbench/workbench.module';
import { ListingModule } from '../Listing/listing.module';

@Module({
    imports: [WorkbenchModule, ListingModule],
    controllers: [ResourceController],
    providers: [ResourceService, ResourceRepository],
})
export class ResourceModule { }
