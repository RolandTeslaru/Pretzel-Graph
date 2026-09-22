import { Module } from '@nestjs/common';
import { ActivePublicationModule } from '../ActivePublication/active-publication.module';
import { ExecutionModule } from '../Execution/execution.module';
import { GatewayModule } from '../Gateway/gateway.module';
import { ShelfModule } from '../Shelf/shelf.module';
import { GatewayIgnitionService } from './gateway-ignition.service';

@Module({
    imports: [ActivePublicationModule, ExecutionModule, GatewayModule, ShelfModule],
    providers: [GatewayIgnitionService],
})
export class GatewayIgnitionModule {}
