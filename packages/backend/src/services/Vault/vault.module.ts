import { Module } from '@nestjs/common';
import { VaultController } from './vault.controller';
import { VaultService } from './vault.service';
import { VaultDatabase } from './vault.database';

@Module({
    controllers: [VaultController],
    providers:   [VaultService, VaultDatabase],
    exports:     [VaultService],
})
export class VaultModule {}
