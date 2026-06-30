import { Controller, Post, UseGuards, Req, HttpCode } from '@nestjs/common';
import { HumanReviewService } from './human-review.service';
import { Auth, HumanReview } from '@pretzel-graph/shared/domain';
import { SupabaseAuthGuard, AuthenticatedRequest } from '../../auth/supabase-auth.guard';
import { ZodBody } from '../../pipes/zod.pipe';

@Controller('human-review')
export class HumanReviewController {
    constructor(private readonly humanReviewService: HumanReviewService) {}

    @Post('respond')
    @UseGuards(SupabaseAuthGuard)
    @HttpCode(200)
    async respond(
        @Req() req: AuthenticatedRequest,
        @ZodBody(HumanReview.API.HumanResponded.Request) body: HumanReview.API.HumanResponded.Request,
    ) {
        return this.humanReviewService.humanResponded(req.user.id as Auth.User.Id, body);
    }
}
