import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

/** Liveness. Unauthenticated and outside the api prefix — callers have no token. */
@Controller('health')
@SkipThrottle()
export class HealthController {

    @Get()
    check(): { status: string } {
        return { status: 'ok' };
    }
}
