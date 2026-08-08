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

export const AuthenticatedUser = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): Principal.User => {
        const { principal } = ctx.switchToHttp().getRequest<{ principal?: Principal }>();

        if (principal?.type !== 'user')
            throw new UnauthorizedException('User principal required');

        return principal;
    },
);
