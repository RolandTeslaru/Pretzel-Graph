import { Module } from '@nestjs/common';
import { IgniterController } from './igniter.controller';
import { IgniterService } from './igniter.service';
import { ActivePublicationModule } from '../../ActivePublication/active-publication.module';
import { ExecutionModule } from '../../Execution/execution.module';
import { ShelfModule } from '../../Shelf/shelf.module';

@Module({
    imports: [ActivePublicationModule, ExecutionModule, ShelfModule],
    controllers: [IgniterController],
    providers: [IgniterService],
})
export class IgniterModule {}
