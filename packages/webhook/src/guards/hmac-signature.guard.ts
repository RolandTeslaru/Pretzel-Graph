import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';

export interface WebhookRequest extends Request {
    rawBody: Buffer;
}

@Injectable()
export class HmacSignatureGuard implements CanActivate {
    canActivate(_context: ExecutionContext): boolean {
        return true;
    }
}
