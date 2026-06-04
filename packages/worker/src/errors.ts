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

/**
 * Thrown when a propagating error envelope reaches a node with no wired outgoing
 * edges — the error was never caught, so the whole run terminates. `data.path`
 * carries the ordered node-id trace the error travelled.
 */
export class UncaughtRuntimeNodeError extends AggexExecutionError {
    constructor(message: string, path: string[]) {
        super(SystemError.Code.EXECUTION_UNCAUGHT_NODE_ERROR, message, { data: { path } })
        this.name = "UncaughtRuntimeNodeError"
        Object.setPrototypeOf(this, UncaughtRuntimeNodeError.prototype)
    }
}

/**
 * Thrown when a propagating error envelope loops back onto a node already in its
 * own propagation path — the error cycled on itself, so the run terminates.
 * `data.path` carries the full loop (the revisited node appended at the end).
 */
export class CyclicalUncaughtRuntimeNodeError extends AggexExecutionError {
    constructor(message: string, path: string[]) {
        super(SystemError.Code.EXECUTION_CYCLIC_ERROR_PROPAGATION, message, { data: { path } })
        this.name = "CyclicalUncaughtRuntimeNodeError"
        Object.setPrototypeOf(this, CyclicalUncaughtRuntimeNodeError.prototype)
    }
}
