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
 * is caught and re-thrown as a SupabaseError tagged with the operation name.
 */
export function withSupabaseAssert<TArgs extends any[], TReturn>(
    operation: string,
    fn: (...args: TArgs) => Promise<TReturn>
): (...args: TArgs) => Promise<TReturn> {
    return async (...args: TArgs) => {
        try {
            return await fn(...args);
        } catch (err) {
            throw new SupabaseError(operation, err);
        }
    };
}
