import { Module } from '@nestjs/common';
import { GatewayRepository } from './gateway.repository';
import { GatewayService } from './gateway.service';
import { GatewayController } from './gateway.controller';
import { RealtimeModule } from '../Realtime/realtime.module';

@Module({
    imports:     [RealtimeModule],
    controllers: [GatewayController],
    providers:   [GatewayRepository, GatewayService],
    exports:     [GatewayService],
})
export class GatewayModule {}
