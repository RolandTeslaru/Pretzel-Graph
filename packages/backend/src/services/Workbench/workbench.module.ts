import { Module } from '@nestjs/common';
import { WorkbenchController } from './workbench.controller';
import { WorkbenchService } from './workbench.service';
import { WorkbenchDatabase } from './workbench.database';
import { VaultModule } from '../Vault/vault.module';

@Module({
    imports: [VaultModule],
    controllers: [WorkbenchController],
    providers: [WorkbenchService, WorkbenchDatabase],
})
export class WorkbenchModule { }
