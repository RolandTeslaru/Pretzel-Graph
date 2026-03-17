import { CanActivate, ExecutionContext as NestExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { createAuthenticatedClient, getUserId } from '../utils/supabase';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

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

        // Allow service_role key (used by worker for server-to-server calls)
        // Verified by comparing against the known key from environment
        if (SUPABASE_SERVICE_ROLE_KEY && token === SUPABASE_SERVICE_ROLE_KEY) {
            request.user = { id: 'service-role' };
            request.token = token;
            return true;
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
