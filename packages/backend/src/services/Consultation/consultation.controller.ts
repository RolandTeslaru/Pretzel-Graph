import { Controller, Post, UseGuards, HttpCode } from '@nestjs/common';
import { ConsultationService } from './consultation.service';
import { Consultation, Execution } from '@pretzel-graph/shared/domain';
import { UserAuthGuard } from '../../auth/user-auth.guard';
import { Scoped } from '../../auth/scoped.decorator';
import { ExecutionIdParam } from '@/decorators/scope';
import { ZodBody } from '../../pipes/zod.pipe';

@Controller('consultation')
@UseGuards(UserAuthGuard)
export class ConsultationController {
    constructor(private readonly consultationService: ConsultationService) {}

    @Post(':executionId/answer')
    @Scoped('execution')
    @HttpCode(200)
    async answer(
        @ExecutionIdParam() executionId: Execution.Id,
        @ZodBody(Consultation.API.Answer.Request) body: Consultation.API.Answer.Request,
    ) {
        return this.consultationService.answer(executionId, body);
    }
}
