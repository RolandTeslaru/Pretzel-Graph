import { ExceptionFilter, Catch, ArgumentsHost, HttpException, Logger } from '@nestjs/common';
import { Response } from 'express';
import { SystemError } from '@pretzel-graph/shared/domain/SystemError';
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

    private resolve(exception: unknown): { status: number; error: SystemError.Serialized } {
        // Already a SystemError — use it directly
        if (exception instanceof SystemError) {
            return {
                status: this.httpStatusFromCode(exception.code),
                error: exception.toJSON(),
            };
        }

        // NestJS HttpException — preserve the HTTP status, wrap as infra
        if (exception instanceof HttpException) {
            return {
                status: exception.getStatus(),
                error: new SystemError(
                    SystemError.Code.INFRA_UNKNOWN,
                    "Something went wrong",
                    { detail: exception.message }
                ).toJSON(),
            };
        }

        // Zod validation — bad request body
        if (exception instanceof ZodError) {
            const detail = exception.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
            return {
                status: 400,
                error: new SystemError(
                    SystemError.Code.CONFIG_INVALID_FIELD,
                    "Invalid request data",
                    { detail }
                ).toJSON(),
            };
        }

        // Unknown — generic fallback
        return {
            status: 500,
            error: SystemError.fromUnknown(exception).toJSON(),
        };
    }

    private httpStatusFromCode(code: SystemError.Code): number {
        if (code === SystemError.Code.NOT_FOUND) return 404;

        const prefix = Math.floor(code / 1000)
        switch (prefix) {
            case 1: return 422;  // compilation
            case 2: return 500;  // execution
            case 3: return 400;  // config
            case 4: return 502;  // provider
            case 5: return 500;  // infra
            default: return 500;
        }
    }
}
