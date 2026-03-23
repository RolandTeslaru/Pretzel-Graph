import z from "zod"


export class SysError extends Error {
    public readonly code: SysError.Code
    public readonly severity: SysError.Severity
    public readonly detail?: string
    public readonly data?: unknown

    constructor(
        code: SysError.Code,
        message: string,
        opts?: { severity?: SysError.Severity; detail?: string; data?: unknown }
    ) {
        super(message)
        this.code = code
        this.severity = opts?.severity ?? "error"
        this.detail = opts?.detail
        this.data = opts?.data
        this.name = "SysError"
        Object.setPrototypeOf(this, SysError.prototype)
    }

    public get category(): SysError.Category {
        return SysError.categoryFromCode(this.code)
    }

    /** Serialize to plain JSON for the wire (Redis, WebSocket, HTTP). */
    public toJSON(): SysError.Serialized {
        return {
            code: this.code,
            category: this.category,
            severity: this.severity,
            message: this.message,
            ...(this.detail !== undefined && { detail: this.detail }),
            ...(this.data !== undefined && { data: this.data }),
        }
    }

    /** Wrap any caught value into a SysError. Already a SysError? Return as-is. */
    public static fromUnknown(err: unknown, fallbackCode?: SysError.Code): SysError {
        if (err instanceof SysError) return err

        const message = err instanceof Error ? err.message : String(err)
        const detail = err instanceof Error ? err.stack : undefined
        return new SysError(
            fallbackCode ?? SysError.Code.EXECUTION_NODE_FAILED,
            message,
            { detail }
        )
    }
}


export namespace SysError {

    // ── Error Codes ────────────────────────────────────────────────
    // Numeric enum grouped by domain. The thousand-digit = category.

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
    }


    // ── Derived enums ──────────────────────────────────────────────

    export const Category = z.enum([
        "COMPILATION",
        "EXECUTION",
        "CONFIG",
        "PROVIDER",
        "INFRA",
    ])
    export type Category = z.infer<typeof Category>

    export const Severity = z.enum(["warning", "error"])
    export type Severity = z.infer<typeof Severity>


    // ── Serialized (wire format) ───────────────────────────────────

    export const Schema = z.object({
        code:     z.enum(Code),
        category: Category,
        severity: Severity,
        message:  z.string(),
        detail:   z.string().optional(),
        data:     z.unknown().optional(),
    })

    export type Serialized = z.infer<typeof Schema>


    // ── Helpers ────────────────────────────────────────────────────

    /** Human-readable category labels for toast display. */
    const CATEGORY_LABELS: Record<Category, string> = {
        COMPILATION: "Compilation error",
        EXECUTION:   "Execution error",
        CONFIG:      "Configuration error",
        PROVIDER:    "Provider error",
        INFRA:       "Database error",
    }

    /**
     * Build a user-facing error string from any caught error.
     * Pass `context` to describe what the user was trying to do.
     *
     * Examples:
     *   messageFrom(err)                    → "Database error 5001"
     *   messageFrom(err, "send message")    → "Could not send message — Database error 5001"
     *   messageFrom(err, "compile workflow") → "Could not compile workflow — Compilation error 1001"
     *
     * For user-facing categories (config, provider, compilation), uses the SysError message directly:
     *   messageFrom(err, "run workflow")    → "Could not run workflow — Missing API key for OpenAI"
     */
    export function messageFrom(err: unknown, context?: string): string {
        const serialized = extractSerialized(err)

        if (serialized) {
            const isInternal = serialized.category === "INFRA" || serialized.category === "EXECUTION"
            const errorPart = isInternal
                ? `${CATEGORY_LABELS[serialized.category]} ${serialized.code}`
                : serialized.message

            return context
                ? `Could not ${context} — ${errorPart}`
                : errorPart
        }

        const fallback = err instanceof Error ? err.message : String(err)
        return context ? `Could not ${context}` : fallback
    }

    /**
     * Extract the full SysError.Serialized from any caught error, if present.
     * Useful when the frontend needs to switch on code/category for programmatic decisions.
     */
    export function extractSerialized(err: unknown): Serialized | null {
        // SysError class instance
        if (err instanceof SysError) return err.toJSON()
        // Axios error with SysError.Serialized in response body
        if (typeof err === "object" && err !== null && "response" in err) {
            const sysError = (err as any).response?.data?.error as Serialized | undefined
            if (sysError?.code !== undefined && sysError?.message) return sysError
        }
        return null
    }

    /** Derive category from the code's thousand-digit. */
    export function categoryFromCode(code: Code): Category {
        const prefix = Math.floor(code / 1000)
        switch (prefix) {
            case 1: return "COMPILATION"
            case 2: return "EXECUTION"
            case 3: return "CONFIG"
            case 4: return "PROVIDER"
            case 5: return "INFRA"
            default: return "INFRA"
        }
    }
}
