import { Controller, Post, UseGuards, HttpCode } from '@nestjs/common';
import { HumanReviewService } from './human-review.service';
import { HumanReview } from '@pretzel-graph/shared/domain';
import { UserAuthGuard } from '../../auth/user-auth.guard';
import { AuthenticatedUser } from '@/decorators/principal';
import { Principal } from '@/domain/Principal';
import { ZodBody } from '../../pipes/zod.pipe';

@Controller('human-review')
export class HumanReviewController {
    constructor(private readonly humanReviewService: HumanReviewService) {}

    @Post('respond')
    @UseGuards(UserAuthGuard)
    @HttpCode(200)
    async respond(
        @AuthenticatedUser() principal: Principal.User,
        @ZodBody(HumanReview.API.HumanResponded.Request) body: HumanReview.API.HumanResponded.Request,
    ) {
        return this.humanReviewService.humanResponded(principal, body);
    }
}
