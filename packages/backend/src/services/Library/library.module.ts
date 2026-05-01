import { Module } from '@nestjs/common';
import { LibraryController } from './library.controller';
import { LibraryService } from './library.service';
import { LibraryDatabase } from './library.database';

@Module({
    controllers: [LibraryController],
    providers: [LibraryService, LibraryDatabase],
})
export class LibraryModule { }
