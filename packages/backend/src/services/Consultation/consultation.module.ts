import { Module } from '@nestjs/common';
import { ConsultationController } from './consultation.controller';
import { ConsultationService } from './consultation.service';
import { RealtimeModule } from '../Realtime/realtime.module';
import { PermissionModule } from '../Permission/permission.module';

@Module({
    imports: [RealtimeModule, PermissionModule],
    controllers: [ConsultationController],
    providers: [ConsultationService],
})
export class ConsultationModule {}
