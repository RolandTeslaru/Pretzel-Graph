import { Controller, Post, UseGuards, HttpCode } from '@nestjs/common';
import { HumanReviewService } from './human-review.service';
import { HumanReview } from '@pretzel-graph/shared/domain';
import { SupabaseAuthGuard } from '../../auth/supabase-auth.guard';
import { CurrentUser } from '@/decorators/principal';
import { Principal } from '@/domain/Principal';
import { ZodBody } from '../../pipes/zod.pipe';

@Controller('human-review')
export class HumanReviewController {
    constructor(private readonly humanReviewService: HumanReviewService) {}

    @Post('respond')
    @UseGuards(SupabaseAuthGuard)
    @HttpCode(200)
    async respond(
        @CurrentUser() principal: Principal.User,
        @ZodBody(HumanReview.API.HumanResponded.Request) body: HumanReview.API.HumanResponded.Request,
    ) {
        return this.humanReviewService.humanResponded(principal, body);
    }
}
