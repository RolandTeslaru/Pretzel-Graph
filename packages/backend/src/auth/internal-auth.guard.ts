import { CanActivate, ExecutionContext as NestExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import dotenv from 'dotenv';

dotenv.config();

const INTERNAL_SERVICE_SECRET = process.env.INTERNAL_SERVICE_SECRET;

@Injectable()
export class InternalAuthGuard implements CanActivate {
    async canActivate(context: NestExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        const token = request.headers['x-internal-token'] as string | undefined;

        if (!token) {
            throw new UnauthorizedException('Missing internal token');
        }

        if (!INTERNAL_SERVICE_SECRET) {
            throw new UnauthorizedException('Internal auth not configured');
        }

        if (token !== INTERNAL_SERVICE_SECRET) {
            throw new UnauthorizedException('Invalid internal token');
        }

        return true;
    }
}
