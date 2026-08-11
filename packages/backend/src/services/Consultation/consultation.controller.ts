import { Controller, Post, UseGuards, HttpCode } from '@nestjs/common';
import { ConsultationService } from './consultation.service';
import { Consultation } from '@pretzel-graph/shared/domain';
import { UserAuthGuard } from '../../auth/user-auth.guard';
import { AuthenticatedUser } from '@/decorators/principal';
import { Principal } from '@/domain/Principal';
import { ZodBody } from '../../pipes/zod.pipe';

@Controller('consultation')
export class ConsultationController {
    constructor(private readonly consultationService: ConsultationService) {}

    @Post('respond')
    @UseGuards(UserAuthGuard)
    @HttpCode(200)
    async respond(
        @AuthenticatedUser() principal: Principal.User,
        @ZodBody(Consultation.API.HumanResponded.Request) body: Consultation.API.HumanResponded.Request,
    ) {
        return this.consultationService.respond(principal, body);
    }
}
