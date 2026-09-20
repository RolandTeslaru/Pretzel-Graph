import { Module } from '@nestjs/common';
import { IgniterModule } from './Igniter/igniter.module';
import { IgniterTestModule } from './IgniterTest/igniter-test.module';
import { ActivePublicationModule } from '../ActivePublication/active-publication.module';

@Module({
    imports: [ActivePublicationModule, IgniterTestModule, IgniterModule],
    exports: [IgniterTestModule],
})
export class WebhookIgnitionModule {}
