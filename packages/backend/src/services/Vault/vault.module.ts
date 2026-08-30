import { Module } from '@nestjs/common';
import { VaultController } from './vault.controller';
import { VaultService } from './vault.service';
import { VaultRepository } from './vault.repository';

@Module({
    controllers: [VaultController],
    providers:   [VaultService, VaultRepository],
    exports:     [VaultService, VaultRepository],
})
export class VaultModule {}
