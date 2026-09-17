import { Module } from '@nestjs/common';
import { AxiosService } from './index';

@Module({
    providers: [AxiosService],
    exports:   [AxiosService],
})
export class AxiosModule {}
