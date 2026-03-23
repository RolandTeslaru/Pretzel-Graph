import { SysError } from "@vx-agent-editor/shared/domain/SysError";

/**
 * Base error for the Aggex execution engine.
 * Extends SysError so it serializes over the wire automatically.
 */
export class AggexError extends SysError {
    constructor(
        code: SysError.Code,
        message: string,
        opts?: { severity?: SysError.Severity; detail?: string; data?: unknown }
    ) {
        super(code, message, opts)
        this.name = "AggexError"
        Object.setPrototypeOf(this, AggexError.prototype)
    }
}

/** Thrown during workflow compilation (graph validation, missing nodes, etc.) */
export class AggexCompilerError extends AggexError {
    constructor(
        code: SysError.Code,
        message: string,
        opts?: { severity?: SysError.Severity; detail?: string; data?: unknown }
    ) {
        super(code, message, opts)
        this.name = "AggexCompilerError"
        Object.setPrototypeOf(this, AggexCompilerError.prototype)
    }
}

/** Thrown during node execution within the engine. */
export class AggexExecutionError extends AggexError {
    constructor(
        code: SysError.Code,
        message: string,
        opts?: { severity?: SysError.Severity; detail?: string; data?: unknown }
    ) {
        super(code, message, opts)
        this.name = "AggexExecutionError"
        Object.setPrototypeOf(this, AggexExecutionError.prototype)
    }
}
