import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Principal } from '@/domain/Principal';

export const AuthenticatedPrincipal = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): Principal => {
        const { principal } = ctx.switchToHttp().getRequest<{ principal?: Principal }>();

        if (!principal)
            throw new UnauthorizedException('No principal on request');

        return principal;
    },
);

/** The principal a running execution acts under. Populated by DelegateAuthGuard. */
export const AuthenticatedDelegate = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): Principal.Delegate => {
        const { delegate } = ctx.switchToHttp().getRequest<{ delegate?: Principal.Delegate }>();

        if (!delegate)
            throw new UnauthorizedException('No delegate on request');

        return delegate;
    },
);

export const AuthenticatedUser = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): Principal.User => {
        const { principal } = ctx.switchToHttp().getRequest<{ principal?: Principal }>();

        if (principal?.type !== 'user')
            throw new UnauthorizedException('User principal required');

        return principal;
    },
);
