import { Module } from '@nestjs/common';
import { CloudModule } from '../Cloud/cloud.module';
import { ShelfController } from './shelf.controller';
import { ShelfService } from './shelf.service';

@Module({
    imports: [CloudModule],
    controllers: [ShelfController],
    providers: [ShelfService],
    exports: [ShelfService],
})
export class ShelfModule { }
