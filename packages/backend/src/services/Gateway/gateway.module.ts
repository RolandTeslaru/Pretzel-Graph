import { Module } from '@nestjs/common';
import { GatewayRepository } from './gateway.repository';
import { GatewayService } from './gateway.service';
import { GatewayController } from './gateway.controller';
import { RealtimeModule } from '../Realtime/realtime.module';
import { VaultModule } from '../Vault/vault.module';

@Module({
    imports:     [RealtimeModule, VaultModule],
    controllers: [GatewayController],
    providers:   [GatewayRepository, GatewayService],
    exports:     [GatewayService],
})
export class GatewayModule {}
