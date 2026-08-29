import { Module } from '@nestjs/common';
import { ActivityController } from './activity.controller';
import { ActivityService } from './activity.service';
import { ActivityDatabase } from './activity.database';

@Module({
    controllers: [ActivityController],
    providers: [ActivityService, ActivityDatabase],
    exports: [ActivityService],
})
export class ActivityModule { }
