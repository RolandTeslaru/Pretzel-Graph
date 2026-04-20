import { Module } from '@nestjs/common';
import { VersionControlController } from './version-control.controller';
import { VersionControlService } from './version-control.service';
import { RealtimeModule } from '../Realtime/realtime.module';

@Module({
    imports: [RealtimeModule],
    controllers: [VersionControlController],
    providers: [VersionControlService],
    exports: [VersionControlService],
})
export class VersionControlModule {}
