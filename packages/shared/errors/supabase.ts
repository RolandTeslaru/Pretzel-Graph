import { SystemError } from "../domain/SystemError";
import { DatabaseError } from "../domain/SystemError";

/**
 * Wraps an async function so that any error thrown (including from .throwOnError())
 * is caught and re-thrown as a DatabaseError tagged with INFRA_DATABASE_ERROR.
 */
export function withSupabaseAssert<TArgs extends any[], TReturn>(
    operation: string,
    fn: (...args: TArgs) => Promise<TReturn>
): (...args: TArgs) => Promise<TReturn> {
    return async (...args: TArgs) => {
        try {
            return await fn(...args);
        } catch (err) {
            if (err instanceof SystemError) throw err;
            const detail = err instanceof Error ? err.message : String(err);
            console.error(`Database error during ${operation}:`, err);
            throw new DatabaseError(
                SystemError.Code.INFRA_DATABASE_ERROR,
                "Something went wrong",
                { detail: `[${operation}] ${detail}`, data: { operation } }
            );
        }
    };
}
