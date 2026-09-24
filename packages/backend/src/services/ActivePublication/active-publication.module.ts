import { Module } from '@nestjs/common';
import { ActivePublicationRepository } from './active-publication.repository';
import { ActivePublicationService } from './active-publication.service';

@Module({
    providers: [ActivePublicationRepository, ActivePublicationService],
    exports: [ActivePublicationService],
})
export class ActivePublicationModule {}
