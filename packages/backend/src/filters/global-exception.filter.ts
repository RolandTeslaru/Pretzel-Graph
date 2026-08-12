import { ExceptionFilter, Catch, ArgumentsHost, HttpException, Logger } from '@nestjs/common';
import { Response } from 'express';
import { SystemError } from '@pretzel-graph/shared/domain/SystemError';
import { ZodError } from 'zod';
import { NoResultError } from 'kysely';

const PG_INSUFFICIENT_PRIVILEGE = '42501';

/** pg surfaces the server's error fields on DatabaseError — see pg-protocol messages.d.ts. */
type PostgresError = Error & { code?: string, table?: string, column?: string };

const isPostgresError = (e: unknown): e is PostgresError =>
    e instanceof Error && typeof (e as PostgresError).code === 'string';

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

        // These two branches are a FALLBACK. Queries through @DatabaseClass are already
        // classified by catchDatabaseErrors (decorators/database-roles.ts) — 42501 → FORBIDDEN,
        // NoResultError → NOT_FOUND — and arrive here as a SystemError, handled above. Only
        // inline queries that skip the decorator (e.g. AuthService.getMe) reach this raw, and
        // they must land on the same codes so the two paths agree.

        // Postgres insufficient_privilege: a column grant refused the write, or an RLS WITH
        // CHECK rejected the resulting row. Neither hides existence — the caller acted on its
        // own or new data — so this is FORBIDDEN, not NOT_FOUND. The offending table/column is
        // logged but never returned.
        if (isPostgresError(exception) && exception.code === PG_INSUFFICIENT_PRIVILEGE) {
            this.logger.error(
                `42501 insufficient_privilege on ${exception.table ?? '?'}.${exception.column ?? '?'} — ${exception.message}`,
            );

            return {
                status: this.httpStatusFromCode(SystemError.Code.FORBIDDEN),
                error: new SystemError(SystemError.Code.FORBIDDEN, "Forbidden").toJSON(),
            };
        }

        // executeTakeFirstOrThrow found nothing. Under an RLS-scoped handle that means the row
        // does not exist or is not visible to this caller — both a 404, not a server fault.
        if (exception instanceof NoResultError) {
            return {
                status: 404,
                error: new SystemError(SystemError.Code.NOT_FOUND, "Not found").toJSON(),
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
        // Codes below 1000 are literal HTTP statuses (BAD_REQUEST 400, FORBIDDEN 403,
        // NOT_FOUND 404). The prefix scheme below only applies to the 1000+ domain codes.
        if (code < 1000) return code;

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
