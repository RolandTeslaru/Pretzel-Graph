import { Module } from '@nestjs/common';
import { VersionControlController } from './version-control.controller';
import { VersionControlService } from './version-control.service';
import { VersionControlDatabase } from './version-control.database';
import { RealtimeModule } from '../Realtime/realtime.module';
import { ListingModule } from '../Listing/listing.module';

@Module({
    imports: [RealtimeModule, ListingModule],
    controllers: [VersionControlController],
    providers: [VersionControlService, VersionControlDatabase],
    exports: [VersionControlService, VersionControlDatabase],
})
export class VersionControlModule {}
