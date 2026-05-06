import { Module } from '@nestjs/common';
import { WorkbenchController } from './workbench.controller';
import { WorkbenchService } from './workbench.service';
import { WorkbenchDatabase } from './workbench.database';
import { VersionControlModule } from '../VersionControl/version-control.module';

@Module({
    imports: [VersionControlModule],
    controllers: [WorkbenchController],
    providers: [WorkbenchService, WorkbenchDatabase],
})
export class WorkbenchModule { }
