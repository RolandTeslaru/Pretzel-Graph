import { SystemError } from "@pretzel-graph/shared/domain/SystemError";

/**
 * Base error for the Aggex execution engine.
 * Extends SystemError so it serializes over the wire automatically.
 */
export class AggexError extends SystemError {
    constructor(
        code: SystemError.Code,
        message: string,
        opts?: { detail?: string; data?: unknown }
    ) {
        super(code, message, opts)
        this.name = "AggexError"
        Object.setPrototypeOf(this, AggexError.prototype)
    }
}

/** Thrown during workflow compilation (graph validation, missing nodes, etc.) */
export class AggexCompilerError extends AggexError {
    constructor(
        code: SystemError.Code,
        message: string,
        opts?: { detail?: string; data?: unknown }
    ) {
        super(code, message, opts)
        this.name = "AggexCompilerError"
        Object.setPrototypeOf(this, AggexCompilerError.prototype)
    }
}

/** Thrown during node execution within the engine. */
export class AggexExecutionError extends AggexError {
    constructor(
        code: SystemError.Code,
        message: string,
        opts?: { detail?: string; data?: unknown }
    ) {
        super(code, message, opts)
        this.name = "AggexExecutionError"
        Object.setPrototypeOf(this, AggexExecutionError.prototype)
    }
}
