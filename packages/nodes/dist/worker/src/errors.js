"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CyclicalRuntimeNodeError = exports.UncaughtRuntimeNodeError = exports.AggexExecutionError = exports.AggexCompilerError = exports.AggexError = void 0;
const SystemError_1 = require("../../shared/domain/SystemError");
/**
 * Base error for the Aggex execution engine.
 * Extends SystemError so it serializes over the wire automatically.
 */
class AggexError extends SystemError_1.SystemError {
    constructor(code, message, opts) {
        super(code, message, opts);
        this.name = "AggexError";
        Object.setPrototypeOf(this, AggexError.prototype);
    }
}
exports.AggexError = AggexError;
/** Thrown during workflow compilation (graph validation, missing nodes, etc.) */
class AggexCompilerError extends AggexError {
    constructor(code, message, opts) {
        super(code, message, opts);
        this.name = "AggexCompilerError";
        Object.setPrototypeOf(this, AggexCompilerError.prototype);
    }
}
exports.AggexCompilerError = AggexCompilerError;
/** Thrown during node execution within the engine. */
class AggexExecutionError extends AggexError {
    constructor(code, message, opts) {
        super(code, message, opts);
        this.name = "AggexExecutionError";
        Object.setPrototypeOf(this, AggexExecutionError.prototype);
    }
}
exports.AggexExecutionError = AggexExecutionError;
/**
 * Thrown when a propagating error envelope reaches a node with no wired outgoing
 * edges — the error was never caught, so the whole run terminates. `data.path`
 * carries the ordered node-id trace the error travelled.
 */
class UncaughtRuntimeNodeError extends AggexExecutionError {
    constructor(message, path) {
        super(SystemError_1.SystemError.Code.EXECUTION_UNCAUGHT_NODE_ERROR, message, { data: { path } });
        this.name = "UncaughtRuntimeNodeError";
        Object.setPrototypeOf(this, UncaughtRuntimeNodeError.prototype);
    }
}
exports.UncaughtRuntimeNodeError = UncaughtRuntimeNodeError;
/**
 * Thrown when a propagating error envelope loops back onto a node already in its
 * own propagation path — the error cycled on itself, so the run terminates.
 * `data.path` carries the full loop (the revisited node appended at the end).
 */
class CyclicalRuntimeNodeError extends AggexExecutionError {
    constructor(message, path) {
        super(SystemError_1.SystemError.Code.EXECUTION_CYCLIC_ERROR_PROPAGATION, message, { data: { path } });
        this.name = "CyclicalRuntimeNodeError";
        Object.setPrototypeOf(this, CyclicalRuntimeNodeError.prototype);
    }
}
exports.CyclicalRuntimeNodeError = CyclicalRuntimeNodeError;
