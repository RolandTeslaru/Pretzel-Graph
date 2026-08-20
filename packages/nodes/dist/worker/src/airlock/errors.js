"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AirlockTerminationError = exports.AirlockError = void 0;
const domain_1 = require("../../../shared/domain");
/** A recoverable airlock failure (compile/lookup/runtime throw) — routes to the node's onError. */
class AirlockError extends Error {
    constructor(message, cause) {
        super(message, { cause });
        this.name = "AirlockError";
    }
}
exports.AirlockError = AirlockError;
/**
 * The shared Isolate was disposed mid-run (memory limit / OOM). The isolate is
 * unrecoverable and every scope on it is dead, so this must **terminate the whole
 * workflow execution** rather than route to a node's onError.
 */
class AirlockTerminationError extends Error {
    constructor(message = "Airlock isolate disposed (memory limit exceeded)") {
        super(message);
        this.name = domain_1.Airlock.TERMINATION_ERROR_NAME;
    }
}
exports.AirlockTerminationError = AirlockTerminationError;
