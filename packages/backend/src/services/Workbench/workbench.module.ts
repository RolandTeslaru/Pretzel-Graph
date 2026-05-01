import { Module } from '@nestjs/common';
import { WorkbenchController } from './workbench.controller';
import { WorkbenchService } from './workbench.service';
import { WorkbenchDatabase } from './workbench.database';

@Module({
    controllers: [WorkbenchController],
    providers: [WorkbenchService, WorkbenchDatabase],
})
export class WorkbenchModule { }
