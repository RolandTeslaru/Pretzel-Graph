import { Module } from '@nestjs/common';
import { VersionControlController } from './version-control.controller';
import { VersionControlService } from './version-control.service';
import { VersionControlDatabase } from './version-control.database';
import { RealtimeModule } from '../Realtime/realtime.module';

@Module({
    imports: [RealtimeModule],
    controllers: [VersionControlController],
    providers: [VersionControlService, VersionControlDatabase],
    exports: [VersionControlService, VersionControlDatabase],
})
export class VersionControlModule {}
