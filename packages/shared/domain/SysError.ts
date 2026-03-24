import z from "zod"


export class SysError extends Error {
    public readonly code: SysError.Code
    public readonly detail?: string
    public readonly data?: unknown

    constructor(
        code: SysError.Code,
        message: string,
        opts?: { detail?: string; data?: unknown }
    ) {
        super(message)
        this.code = code
        this.detail = opts?.detail
        this.data = opts?.data
        this.name = "SysError"
        Object.setPrototypeOf(this, SysError.prototype)
    }

    /** Serialize to plain JSON for the wire (Redis, WebSocket, HTTP). */
    public toJSON(): SysError.Serialized {
        return {
            code: this.code,
            message: this.message,
            ...(this.detail !== undefined && { detail: this.detail }),
            ...(this.data !== undefined && { data: this.data }),
        }
    }

    /** Wrap any caught value into a SysError. Already a SysError? Return as-is. */
    public static fromUnknown(err: unknown, fallbackCode?: SysError.Code): SysError {
        if (err instanceof SysError) return err

        // Axios error — extract SysError.Serialized from response if present
        if (typeof err === "object" && err !== null && "response" in err) {
            const serialized = (err as any).response?.data?.error as SysError.Serialized | undefined
            if (serialized?.code !== undefined && serialized?.message) {
                return new SysError(serialized.code, serialized.message, {
                    detail: serialized.detail,
                    data: serialized.data,
                })
            }
        }

        // Unknown error — preserve the original message, stack goes in detail
        const message = err instanceof Error ? err.message : String(err)
        const detail = err instanceof Error ? err.stack : undefined
        return new SysError(
            fallbackCode ?? SysError.Code.INFRA_UNKNOWN,
            message,
            { detail }
        )
    }
}


/** Infrastructure / database errors. */
export class DatabaseError extends SysError {
    constructor(
        code: SysError.Code,
        message: string,
        opts?: { detail?: string; data?: unknown }
    ) {
        super(code, message, opts)
        this.name = "DatabaseError"
        Object.setPrototypeOf(this, DatabaseError.prototype)
    }
}


export namespace SysError {

    // ── Error Codes ────────────────────────────────────────────────

    export enum Code {
        // Compilation (1xxx)
        COMPILATION_NODE_NOT_FOUND         = 1001,
        COMPILATION_NO_START_NODES         = 1002,
        COMPILATION_DEADLOCK_CYCLE         = 1003,
        COMPILATION_UNROUTED_CYCLE         = 1004,
        COMPILATION_TRIVIAL_CYCLE          = 1005,
        COMPILATION_TYPE_MISMATCH          = 1006,
        COMPILATION_MISSING_REQUIRED_INPUT = 1007,

        // Execution (2xxx)
        EXECUTION_NODE_FAILED              = 2001,
        EXECUTION_TIMEOUT                  = 2002,
        EXECUTION_ENGINE_KILLED            = 2003,
        EXECUTION_SIGNAL_OVERFLOW          = 2004,
        EXECUTION_XOR_SIGNAL_COLLISION     = 2005,
        EXECUTION_CYCLE_LIMIT_EXCEEDED     = 2006,
        EXECUTION_ACCUMULATOR_OVERFLOW     = 2007,
        EXECUTION_GRAPH_ABORTED            = 2008,
        EXECUTION_TYPE_MISMATCH            = 2009,

        // Configuration (3xxx)
        CONFIG_MISSING_CREDENTIAL          = 3001,
        CONFIG_INVALID_FIELD               = 3002,

        // Provider / External (4xxx)
        PROVIDER_API_ERROR                 = 4001,
        PROVIDER_RATE_LIMITED              = 4002,
        PROVIDER_AUTH_FAILED               = 4003,

        // Infrastructure (5xxx)
        INFRA_DATABASE_ERROR               = 5001,
        INFRA_QUEUE_ERROR                  = 5002,
        INFRA_UNKNOWN                      = 5999,
    }


    // ── Serialized (wire format) ───────────────────────────────────

    export const Schema = z.object({
        code:    z.enum(Code),
        message: z.string(),
        detail:  z.string().optional(),
        data:    z.unknown().optional(),
    })

    export type Serialized = z.infer<typeof Schema>


    // ── Helpers ────────────────────────────────────────────────────

    /**
     * Extract the user-facing message from any caught error.
     * If the error is a SysError (or carries one in an Axios response), returns its message.
     * Otherwise returns a generic fallback.
     */
    export function messageFrom(err: unknown): string {
        if (err instanceof SysError) return err.message

        // Axios error with SysError.Serialized in response
        if (typeof err === "object" && err !== null && "response" in err) {
            const serialized = (err as any).response?.data?.error as Serialized | undefined
            if (serialized?.message) return serialized.message
        }

        return "Something went wrong"
    }
}
