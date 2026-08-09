import z from "zod"


export class SystemError extends Error {
    public readonly code: SystemError.Code
    public readonly detail?: string
    public readonly data?: unknown

    constructor(
        code: SystemError.Code,
        message: string,
        opts?: { detail?: string; data?: unknown }
    ) {
        super(message)
        this.code = code
        this.detail = opts?.detail
        this.data = opts?.data
        this.name = "SystemError"
        Object.setPrototypeOf(this, SystemError.prototype)
    }

    /** Serialize to plain JSON for the wire (Redis, WebSocket, HTTP). */
    public toJSON(): SystemError.Serialized {
        return {
            code: this.code,
            message: this.message,
            ...(this.detail !== undefined && { detail: this.detail }),
            ...(this.data !== undefined && { data: this.data }),
        }
    }

    /** Wrap any caught value into a SystemError. Already a SystemError? Return as-is. */
    public static fromUnknown(err: unknown, fallbackCode?: SystemError.Code): SystemError {
        if (err instanceof SystemError) return err

        // Axios error — extract SystemError.Serialized from response if present
        if (typeof err === "object" && err !== null && "response" in err) {
            const serialized = (err as any).response?.data?.error as SystemError.Serialized | undefined
            if (serialized?.code !== undefined && serialized?.message) {
                return new SystemError(serialized.code, serialized.message, {
                    detail: serialized.detail,
                    data: serialized.data,
                })
            }
        }

        // Unknown error — preserve the original message, stack goes in detail
        const message = err instanceof Error ? err.message : String(err)
        const detail = err instanceof Error ? err.stack : undefined
        return new SystemError(
            fallbackCode ?? SystemError.Code.INFRA_UNKNOWN,
            message,
            { detail }
        )
    }
}


/** Infrastructure / database errors. */
export class DatabaseError extends SystemError {
    constructor(
        code: SystemError.Code,
        message: string,
        opts?: { detail?: string; data?: unknown }
    ) {
        super(code, message, opts)
        this.name = "DatabaseError"
        Object.setPrototypeOf(this, DatabaseError.prototype)
    }
}


export namespace SystemError {

    // ── Error Codes ────────────────────────────────────────────────

    export enum Code {
        // Compilation (1xxx)
        COMPILATION_NODE_NOT_FOUND = 1001,
        COMPILATION_NO_START_NODES = 1002,
        COMPILATION_DEADLOCK_CYCLE = 1003,
        COMPILATION_UNROUTED_CYCLE = 1004,
        COMPILATION_TRIVIAL_CYCLE = 1005,
        COMPILATION_TYPE_MISMATCH = 1006,
        COMPILATION_MISSING_REQUIRED_INPUT = 1007,
        COMPILATION_SUBWORKFLOW_CYCLE = 1008,
        COMPILATION_PROXY_UNSUPPORTED = 1009,
        COMPILATION_NOT_IGNITEABLE = 1010,

        // Execution (2xxx)
        EXECUTION_NODE_FAILED = 2001,
        EXECUTION_TIMEOUT = 2002,
        EXECUTION_ENGINE_KILLED = 2003,
        EXECUTION_SIGNAL_OVERFLOW = 2004,
        EXECUTION_XOR_SIGNAL_COLLISION = 2005,
        EXECUTION_CYCLE_LIMIT_EXCEEDED = 2006,
        EXECUTION_ACCUMULATOR_OVERFLOW = 2007,
        EXECUTION_GRAPH_ABORTED = 2008,
        EXECUTION_TYPE_MISMATCH = 2009,
        EXECUTION_UNCAUGHT_NODE_ERROR = 2010,
        EXECUTION_CYCLIC_ERROR_PROPAGATION = 2011,

        // Configuration (3xxx)
        CONFIG_MISSING_CREDENTIAL = 3001,
        CONFIG_INVALID_FIELD = 3002,
        COMPILATION_MISSING_SUBWORKFLOW_DEPENDENCY = 3003,

        // Provider / External (4xxx)
        PROVIDER_API_ERROR = 4001,
        PROVIDER_RATE_LIMITED = 4002,
        PROVIDER_AUTH_FAILED = 4003,

        // Infrastructure (5xxx)
        INFRA_DATABASE_ERROR = 5001,
        INFRA_QUEUE_ERROR = 5002,
        INFRA_UNKNOWN = 5999,

        // Request-shaped failures. Postgres SQLSTATEs map onto these — see
        // DatabaseClass in backend/src/decorators/transactional.ts.
        BAD_REQUEST = 400,
        FORBIDDEN = 403,
        NOT_FOUND = 404,
        CONFLICT = 409,
    }


    // ── Serialized (wire format) ───────────────────────────────────

    export const Schema = z.object({
        code: z.enum(Code),
        message: z.string(),
        detail: z.string().optional(),
        data: z.unknown().optional(),
    })

    export type Serialized = z.infer<typeof Schema>


    // ── Helpers ────────────────────────────────────────────────────

    /**
     * Extract the user-facing message from any caught error.
     * If the error is a SystemError (or carries one in an Axios response), returns its message.
     * Otherwise returns a generic fallback.
     */
    export function messageFrom(err: unknown): string {
        if (err instanceof SystemError) return err.message

        // Axios error with SystemError.Serialized in response
        if (typeof err === "object" && err !== null && "response" in err) {
            const serialized = (err as any).response?.data?.error as Serialized | undefined
            if (serialized?.message) return serialized.message
        }

        return "Something went wrong"
    }
}
