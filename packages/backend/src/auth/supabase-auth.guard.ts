import { CanActivate, ExecutionContext as NestExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { createAuthenticatedClient, getUserId } from '../utils/supabase';

export interface AuthenticatedRequest extends Request {
    user: {
        id: string;
    };
    token: string;
}

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
    async canActivate(context: NestExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
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

            // Attach user and token to the request object
            request.user = { id: userId };
            request.token = token;

            return true;
        } catch (error) {
            throw new UnauthorizedException();
        }
    }

    private extractTokenFromHeader(request: Request): string | undefined {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : undefined;
    }
}
