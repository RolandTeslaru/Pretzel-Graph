import { CanActivate, ExecutionContext as NestExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { Execution } from '@pretzel-graph/shared/domain';
import { Principal } from '@/domain/Principal';
import { PermissionService } from '@/services/Permission/permission.service';
import { ExecutionToken } from './execution-token';

export interface DelegateAuthenticatedRequest extends Request {
    delegate: Principal.Delegate;
}

/**
 * Authenticates a running execution and resolves the principal it acts under.
 *
 * The execution id comes from the token, not the request body — that is the whole
 * point. A node supplies what it wants written; it cannot choose whose privileges
 * the write runs under. See SPECS/execution-token-delegation.md.
 */
@Injectable()
export class DelegateAuthGuard implements CanActivate {

    constructor(private readonly ownership: PermissionService) {}

    async canActivate(context: NestExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<DelegateAuthenticatedRequest>();

        const executionId = this.resolveExecutionId(request);

        request.delegate = await this.ownership.resolveDelegate(executionId);

        return true;
    }

    private resolveExecutionId(request: Request): Execution.Id {
        const token = request.headers[Execution.Token.HEADER];

        if (typeof token !== 'string')
            throw new UnauthorizedException('Missing execution token');

        try {
            return ExecutionToken.verify(token).executionId;
        }
        catch (error) {
            throw new UnauthorizedException((error as Error).message);
        }
    }
}
