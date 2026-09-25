import { Module } from '@nestjs/common';
import { VersionControlController } from './version-control.controller';
import { VersionControlService } from './version-control.service';
import { VersionControlRepository } from './version-control.repository';
import { RealtimeModule } from '../Realtime/realtime.module';
import { DeploymentModule } from '../Deployment/deployment.module';

@Module({
    imports: [RealtimeModule, DeploymentModule],
    controllers: [VersionControlController],
    providers: [VersionControlService, VersionControlRepository],
    exports: [VersionControlService, VersionControlRepository],
})
export class VersionControlModule {}
