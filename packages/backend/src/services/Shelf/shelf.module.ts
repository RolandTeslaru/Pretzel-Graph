import { Module } from '@nestjs/common';
import { ShelfController } from './shelf.controller';
import { ShelfService } from './shelf.service';

@Module({
    controllers: [ShelfController],
    providers: [ShelfService],
})
export class ShelfModule { }
