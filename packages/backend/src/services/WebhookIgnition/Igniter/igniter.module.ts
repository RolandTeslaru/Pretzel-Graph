import { Module } from '@nestjs/common';
import { IgniterController } from './igniter.controller';
import { IgniterService } from './igniter.service';
import { DeploymentModule } from '../../Deployment/deployment.module';
import { ExecutionModule } from '../../Execution/execution.module';
import { ShelfModule } from '../../Shelf/shelf.module';

@Module({
    imports: [DeploymentModule, ExecutionModule, ShelfModule],
    controllers: [IgniterController],
    providers: [IgniterService],
})
export class IgniterModule {}
