import { Module } from '@nestjs/common';
import { CloudModule } from '../Cloud/cloud.module';
import { ReleaseController } from './release.controller';
import { ReleaseService } from './release.service';

@Module({
    imports:     [CloudModule],
    controllers: [ReleaseController],
    providers:   [ReleaseService],
})
export class ReleaseModule {}
