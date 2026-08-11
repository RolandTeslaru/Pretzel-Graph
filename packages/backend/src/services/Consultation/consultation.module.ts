import { Module } from '@nestjs/common';
import { ConsultationController } from './consultation.controller';
import { ConsultationService } from './consultation.service';
import { RealtimeModule } from '../Realtime/realtime.module';

@Module({
    imports: [RealtimeModule],
    controllers: [ConsultationController],
    providers: [ConsultationService],
})
export class ConsultationModule {}
