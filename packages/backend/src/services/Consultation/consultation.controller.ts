import { Controller, Post, UseGuards, HttpCode } from '@nestjs/common';
import { ConsultationService } from './consultation.service';
import { Consultation, Execution } from '@pretzel-graph/shared/domain';
import { MemberAuthGuard } from '../../auth/member-auth.guard';
import { ExecutionIdParam } from '@/decorators/scope';
import { ZodBody } from '@pretzel-graph/shared/server/pipes/zod.pipe';

@Controller('consultation')
@UseGuards(MemberAuthGuard)
export class ConsultationController {
    constructor(private readonly consultationService: ConsultationService) {}

    @Post(':executionId/answer')
    @HttpCode(200)
    async answer(
        @ExecutionIdParam() executionId: Execution.Id,
        @ZodBody(Consultation.API.Answer.Request) body: Consultation.API.Answer.Request,
    ) {
        return this.consultationService.answer(executionId, body);
    }
}
