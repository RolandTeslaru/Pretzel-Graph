import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthDatabase } from './auth.database';

@Module({
    controllers: [AuthController],
    providers: [AuthService, AuthDatabase],
})
export class AuthModule {}
