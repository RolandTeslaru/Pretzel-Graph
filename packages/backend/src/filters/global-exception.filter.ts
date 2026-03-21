import { ExceptionFilter, Catch, ArgumentsHost, HttpException, Logger } from '@nestjs/common';
import { Response } from 'express';
import { SupabaseError } from '@vx-agent-editor/shared/errors/supabase';
import { ZodError } from 'zod';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(GlobalExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const res = ctx.getResponse<Response>();

        const { status, error } = this.resolve(exception);

        this.logger.error(`[${status}] ${error}`, exception instanceof Error ? exception.stack : undefined);

        res.status(status).json({ status, error });
    }

    private resolve(exception: unknown): { status: number; error: string } {
        if (exception instanceof HttpException) {
            return {
                status: exception.getStatus(),
                error: exception.message,
            };
        }

        if (exception instanceof ZodError) {
            return {
                status: 400,
                error: exception.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
            };
        }

        if (exception instanceof SupabaseError) {
            return {
                status: 500,
                error: exception.message,
            };
        }

        if (exception instanceof Error) {
            return {
                status: 500,
                error: exception.message,
            };
        }

        return {
            status: 500,
            error: 'Internal server error',
        };
    }
}
