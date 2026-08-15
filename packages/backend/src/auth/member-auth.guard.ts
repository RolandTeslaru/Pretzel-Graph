import { CanActivate, ExecutionContext as NestExecutionContext, ForbiddenException, Inject, Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Workspace } from '@pretzel-graph/shared/domain';
import { Token } from '@/domain/Token';
import { Principal } from '@/domain/Principal';
import { verifyToken } from '@/utils/auth';
import { MembershipService } from './membership.service';
import { MIN_ROLE_METADATA, RANK } from './min-role.decorator';

export interface AuthenticatedRequest extends Request {
    principal: Principal.User;
}

/**
 * Proves who the caller is from the token signature, then what they may do from the
 * `members` table. Both are required: a valid token from a non-member is a 403.
 */
@Injectable()
export class MemberAuthGuard implements CanActivate {

    constructor(
        @Inject(MembershipService) private readonly membership: MembershipService,
        @Inject(Reflector)         private readonly reflector:  Reflector,
    ) {}

    async canActivate(context: NestExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

        if (request.principal?.type !== 'user') {
            const token = this.extractTokenFromHeader(request);

            if (!token)
                throw new UnauthorizedException('No token provided');

            const verified = await verifyToken(token).catch(() => {
                // Missing or malformed signing key: ours to fix, not the caller's.
                throw new InternalServerErrorException('Auth is not configured');
            });

            if (!verified)
                throw new UnauthorizedException('Invalid token');

            const role = await this.membership.roleOf(verified);

            if (!role)
                throw new ForbiddenException('Not a member of this workspace');

            request.principal = { type: 'user', userId: verified.userId, role };
        }

        return this.satisfiesMinRole(context, request.principal.role);
    }

    private satisfiesMinRole(context: NestExecutionContext, role: Workspace.Role): boolean {
        const required = this.reflector.getAllAndOverride<Workspace.Role | undefined>(
            MIN_ROLE_METADATA,
            [context.getHandler(), context.getClass()],
        );

        if (required && RANK[role] < RANK[required])
            throw new ForbiddenException(`Requires the ${required} role`);

        return true;
    }

    private extractTokenFromHeader(request: Request): Token.UserSupabaseJWT | undefined {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];

        if (type !== 'Bearer' || !token)
            return undefined;

        const parsed = Token.UserSupabaseJWT.safeParse(token);
        return parsed.success ? parsed.data : undefined;
    }
}
