import { SysError } from "../domain/SysError";

export class SupabaseError extends Error {
    public readonly operation: string;
    public readonly cause: unknown;

    constructor(operation: string, cause: unknown) {
        const message = cause instanceof Error ? cause.message
            : typeof cause === "object" && cause !== null && "message" in cause
                ? String((cause as { message?: unknown }).message)
                : "Unknown Supabase error";
        super(`[${operation}] ${message}`);
        this.operation = operation;
        this.cause = cause;
        this.name = "SupabaseError";
        Object.setPrototypeOf(this, SupabaseError.prototype);
    }
}

/**
 * Wraps an async function so that any error thrown (including from .throwOnError())
 * is caught and re-thrown as a SysError tagged with INFRA_DATABASE_ERROR.
 */
export function withSupabaseAssert<TArgs extends any[], TReturn>(
    operation: string,
    fn: (...args: TArgs) => Promise<TReturn>
): (...args: TArgs) => Promise<TReturn> {
    return async (...args: TArgs) => {
        try {
            return await fn(...args);
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            throw new SysError(
                SysError.Code.INFRA_DATABASE_ERROR,
                `Database operation failed: ${operation}`,
                { detail: message, data: { operation } }
            );
        }
    };
}
