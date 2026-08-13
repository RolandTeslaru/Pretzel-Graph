import { Module } from '@nestjs/common';
import { IgniterTestController } from './igniter-test.controller';
import { IgniterTestService } from './igniter-test.service';

@Module({
    controllers: [IgniterTestController],
    providers: [IgniterTestService],
})
export class IgniterTestModule {}
