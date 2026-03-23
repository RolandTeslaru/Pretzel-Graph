import { ExceptionFilter, Catch, ArgumentsHost, HttpException, Logger } from '@nestjs/common';
import { Response } from 'express';
import { SysError } from '@vx-agent-editor/shared/domain/SysError';
import { ZodError } from 'zod';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(GlobalExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const res = ctx.getResponse<Response>();

        const { status, error } = this.resolve(exception);

        this.logger.error(`[${status}] [${error.code}] ${error.message}`, exception instanceof Error ? exception.stack : undefined);

        res.status(status).json({ status, error });
    }

    private resolve(exception: unknown): { status: number; error: SysError.Serialized } {
        if (exception instanceof SysError) {
            return {
                status: this.httpStatusFromCategory(exception.category),
                error: exception.toJSON(),
            };
        }

        if (exception instanceof HttpException) {
            const status = exception.getStatus();
            const code = status >= 500 ? SysError.Code.INFRA_QUEUE_ERROR : SysError.Code.CONFIG_INVALID_FIELD;
            return {
                status,
                error: SysError.fromUnknown(exception, code).toJSON(),
            };
        }

        if (exception instanceof ZodError) {
            const detail = exception.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
            return {
                status: 400,
                error: new SysError(
                    SysError.Code.CONFIG_INVALID_FIELD,
                    "Invalid request data",
                    { detail }
                ).toJSON(),
            };
        }

        // Unknown error — fallback
        return {
            status: 500,
            error: SysError.fromUnknown(exception, SysError.Code.INFRA_DATABASE_ERROR).toJSON(),
        };
    }

    private httpStatusFromCategory(category: SysError.Category): number {
        switch (category) {
            case "CONFIG":      return 400;
            case "COMPILATION": return 422;
            case "PROVIDER":    return 502;
            case "EXECUTION":   return 500;
            case "INFRA":       return 500;
        }
    }
}
