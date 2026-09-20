import { Module } from '@nestjs/common';
import { IgniterController } from './igniter.controller';
import { IgniterService } from './igniter.service';
import { ActivePublicationModule } from '../../ActivePublication/active-publication.module';
import { ExecutionModule } from '../../Execution/execution.module';

@Module({
    imports: [ActivePublicationModule, ExecutionModule],
    controllers: [IgniterController],
    providers: [IgniterService],
})
export class IgniterModule {}
