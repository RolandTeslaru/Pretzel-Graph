import { Module } from '@nestjs/common';
import { HumanReviewController } from './human-review.controller';
import { HumanReviewService } from './human-review.service';
import { RealtimeModule } from '../Realtime/realtime.module';

@Module({
    imports: [RealtimeModule],
    controllers: [HumanReviewController],
    providers: [HumanReviewService],
})
export class HumanReviewModule {}
