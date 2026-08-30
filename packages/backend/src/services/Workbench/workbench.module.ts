import { Module } from '@nestjs/common';
import { WorkbenchController } from './workbench.controller';
import { WorkbenchService } from './workbench.service';
import { WorkbenchRepository } from './workbench.repository';
import { VaultModule } from '../Vault/vault.module';
import { ShelfModule } from '../Shelf/shelf.module';
import { ListingModule } from '../Listing/listing.module';

@Module({
    imports: [VaultModule, ShelfModule, ListingModule],
    controllers: [WorkbenchController],
    providers: [WorkbenchService, WorkbenchRepository],
})
export class WorkbenchModule { }
