import { Module } from '@nestjs/common';
import { GatewayModule } from '../../Gateway/gateway.module';
import { PermissionModule } from '../../Permission/permission.module';
import { ChatModule } from '../../Chat/chat.module';
import { ShelfModule } from '../../Shelf/shelf.module';
import { GatewayIgniterTestController } from './igniter-test.controller';
import { GatewayIgniterTestService } from './igniter-test.service';

@Module({
    imports: [ChatModule, GatewayModule, PermissionModule, ShelfModule],
    controllers: [GatewayIgniterTestController],
    providers: [GatewayIgniterTestService],
    exports: [GatewayIgniterTestService],
})
export class GatewayIgniterTestModule {}
