import { Module } from '@nestjs/common';
import { VersionControlController } from './version-control.controller';
import { VersionControlService } from './version-control.service';
import { VersionControlRepository } from './version-control.repository';
import { RealtimeModule } from '../Realtime/realtime.module';
import { ListingModule } from '../Listing/listing.module';

@Module({
    imports: [RealtimeModule, ListingModule],
    controllers: [VersionControlController],
    providers: [VersionControlService, VersionControlRepository],
    exports: [VersionControlService, VersionControlRepository],
})
export class VersionControlModule {}
