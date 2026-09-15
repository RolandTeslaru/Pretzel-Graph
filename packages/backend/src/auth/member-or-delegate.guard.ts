import { ExecutionContext as NestExecutionContext, ForbiddenException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Execution } from '@pretzel-graph/shared/domain';
import { MemberService } from '@/services/Member/member.service';
import { PermissionService } from '@/services/Permission/permission.service';
import { AuthenticatedRequest, MemberAuthGuard } from './member-auth.guard';
import { ExecutionToken } from './execution-token';

/**
 * A member route that a running execution may also call, as the user who started it. An
 * execution token resolves to that user's principal, same member, same role; everything after
 * that is the member guard, MinRole included. A run no user started is refused here.
 */
@Injectable()
export class MemberOrDelegateGuard extends MemberAuthGuard {

    constructor(
        @Inject(MemberService)     membership: MemberService,
        @Inject(Reflector)         reflector:  Reflector,
        @Inject(PermissionService) private readonly ownership: PermissionService,
        @Inject(MemberService)     private readonly members:   MemberService,
    ) {
        super(membership, reflector);
    }

    override async canActivate(context: NestExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
        const token   = request.headers[Execution.Token.HEADER];

        if (typeof token === 'string' && request.principal?.type !== 'user')
            request.principal = await this.userBehind(token);

        return super.canActivate(context);
    }

    private async userBehind(token: string) {
        let executionId: Execution.Id;

        try {
            executionId = ExecutionToken.verify(token).executionId;
        }
        catch (error) {
            throw new UnauthorizedException((error as Error).message);
        }

        const delegate = await this.ownership.resolveDelegate(executionId);

        if (!delegate.createdBy)
            throw new ForbiddenException('No user behind this run');

        const role = await this.members.roleOfUser(delegate.createdBy);

        if (!role)
            throw new ForbiddenException('The user behind this run is not a member');

        return { type: 'user' as const, userId: delegate.createdBy, role };
    }
}
