import { Module } from '@nestjs/common';
import { IgniterController } from './igniter.controller';
import { IgniterService } from './igniter.service';
import { RegistrationModule } from '../Registration/registration.module';

@Module({
    imports: [RegistrationModule],
    controllers: [IgniterController],
    providers: [IgniterService],
})
export class IgniterModule {}
