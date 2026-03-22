import z from "zod"


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
        "compilation",
        "execution",
        "config",
        "provider",
        "infra",
    ])
    export type Category = z.infer<typeof Category>

    export const Severity = z.enum(["warning", "error"])
    export type Severity = z.infer<typeof Severity>


    // ── Schema ─────────────────────────────────────────────────────

    export const Schema = z.object({
        code:     z.enum(Code),
        category: Category,
        severity: Severity,
        message:  z.string(),              // user-facing, actionable
        detail:   z.string().optional(),   // internal / debug
        data:     z.unknown().optional(),  // arbitrary context per error code
    })


    // ── Helpers ────────────────────────────────────────────────────

    /** Derive category from the code's thousand-digit. */
    export function categoryFromCode(code: Code): Category {
        const prefix = Math.floor(code / 1000)
        switch (prefix) {
            case 1: return "compilation"
            case 2: return "execution"
            case 3: return "config"
            case 4: return "provider"
            case 5: return "infra"
            default: return "infra"
        }
    }

    /** Shorthand constructor — infers category from code. */
    export function create(
        code: Code,
        severity: Severity,
        message: string,
        opts?: { detail?: string; data?: unknown }
    ): SysError {
        return {
            code,
            category: categoryFromCode(code),
            severity,
            message,
            ...opts,
        }
    }
}

export type SysError = z.infer<typeof SysError.Schema>
