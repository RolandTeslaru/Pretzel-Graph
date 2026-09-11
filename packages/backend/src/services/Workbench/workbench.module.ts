import { Module } from '@nestjs/common';
import { WorkbenchController } from './workbench.controller';
import { InternalWorkbenchController } from './internal-workbench.controller';
import { WorkbenchService } from './workbench.service';
import { WorkbenchSessionService } from './session.service';
import { WorkbenchRepository } from './workbench.repository';
import { VaultModule } from '../Vault/vault.module';
import { ShelfModule } from '../Shelf/shelf.module';
import { ListingModule } from '../Listing/listing.module';
import { RealtimeModule } from '../Realtime/realtime.module';

@Module({
    imports: [VaultModule, ShelfModule, ListingModule, RealtimeModule],
    controllers: [WorkbenchController, InternalWorkbenchController],
    providers: [WorkbenchService, WorkbenchSessionService, WorkbenchRepository],
    exports: [WorkbenchSessionService, WorkbenchRepository],
})
export class WorkbenchModule { }
