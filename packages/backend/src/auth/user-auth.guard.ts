import { CanActivate, ExecutionContext as NestExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { Token } from '@/domain/Token';
import { Principal } from '@/domain/Principal';
import { createAuthenticatedClient, getUserId } from '../utils/supabase';
import { Auth } from '@pretzel-graph/shared/domain';

export interface AuthenticatedRequest extends Request {
    user: {
        id: Auth.User.Id;
    };
    token: Token.UserSupabaseJWT;
    principal: Principal.User;
}

@Injectable()
export class UserAuthGuard implements CanActivate {
    async canActivate(context: NestExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

        // Already authenticated by an outer guard (a controller-level mount, or @Scoped
        // applying this alongside ScopedGuard). Re-validating means a second network call
        // to Supabase for the same token.
        if (request.principal?.type === 'user')
            return true;

        const token = this.extractTokenFromHeader(request);

        if (!token) {
            throw new UnauthorizedException('No token provided');
        }

        try {
            const supabase = createAuthenticatedClient(token);
            const userId = await getUserId(supabase);

            if (!userId) {
                throw new UnauthorizedException('Invalid token');
            }

            request.principal = { type: 'user', userId };

            // Legacy fields — drop once every controller reads the principal.
            request.user = { id: userId };
            request.token = token;

            return true;
        } catch (error) {
            throw new UnauthorizedException();
        }
    }

    private extractTokenFromHeader(request: Request): Token.UserSupabaseJWT | undefined {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];

        if (type !== 'Bearer' || !token)
            return undefined;

        const parsed = Token.UserSupabaseJWT.safeParse(token);
        return parsed.success ? parsed.data : undefined;
    }
}
