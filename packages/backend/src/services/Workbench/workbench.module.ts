import { Module } from '@nestjs/common';
import { WorkbenchController } from './workbench.controller';
import { WorkbenchService } from './workbench.service';
import { WorkbenchDatabase } from './workbench.database';
import { VaultModule } from '../Vault/vault.module';
import { ShelfModule } from '../Shelf/shelf.module';
import { ListingModule } from '../Listing/listing.module';

@Module({
    imports: [VaultModule, ShelfModule, ListingModule],
    controllers: [WorkbenchController],
    providers: [WorkbenchService, WorkbenchDatabase],
})
export class WorkbenchModule { }
