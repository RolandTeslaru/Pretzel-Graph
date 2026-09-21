import { Module } from '@nestjs/common';
import { GatewayRepository } from './gateway.repository';
import { GatewayService } from './gateway.service';
import { RealtimeModule } from '../Realtime/realtime.module';

@Module({
    imports:   [RealtimeModule],
    providers: [GatewayRepository, GatewayService],
    exports:   [GatewayService],
})
export class GatewayModule {}
