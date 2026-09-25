import { Module } from '@nestjs/common';
import { DeploymentController } from './deployment.controller';
import { DeploymentRepository } from './deployment.repository';
import { DeploymentService } from './deployment.service';
import { ListingModule } from '../Listing/listing.module';
import { RealtimeModule } from '../Realtime/realtime.module';

@Module({
    imports: [ListingModule, RealtimeModule],
    controllers: [DeploymentController],
    providers: [DeploymentRepository, DeploymentService],
    exports: [DeploymentRepository, DeploymentService],
})
export class DeploymentModule {}
