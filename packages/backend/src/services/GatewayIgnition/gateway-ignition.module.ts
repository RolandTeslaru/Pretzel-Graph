import { Module } from '@nestjs/common';
import { ActivePublicationModule } from '../ActivePublication/active-publication.module';
import { ExecutionModule } from '../Execution/execution.module';
import { GatewayModule } from '../Gateway/gateway.module';
import { ShelfModule } from '../Shelf/shelf.module';
import { GatewayIgnitionService } from './gateway-ignition.service';
import { GatewayIgniterTestModule } from './IgniterTest/igniter-test.module';

@Module({
    imports: [ActivePublicationModule, ExecutionModule, GatewayModule, ShelfModule, GatewayIgniterTestModule],
    providers: [GatewayIgnitionService],
})
export class GatewayIgnitionModule {}
