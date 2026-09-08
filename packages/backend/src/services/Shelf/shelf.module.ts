import { Module } from '@nestjs/common';
import { CloudModule } from '../Cloud/cloud.module';
import { ShelfController } from './shelf.controller';
import { InternalShelfController } from './internal-shelf.controller';
import { ShelfService } from './shelf.service';

@Module({
    imports: [CloudModule],
    controllers: [ShelfController, InternalShelfController],
    providers: [ShelfService],
    exports: [ShelfService],
})
export class ShelfModule { }
