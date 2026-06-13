import { Airlock } from "@pretzel-graph/shared/domain";

/** A recoverable airlock failure (compile/lookup/runtime throw) — routes to the node's onError. */
export class AirlockError extends Error {
    constructor(message: string, cause?: unknown) {
        super(message, { cause });
        this.name = "AirlockError";
    }
}

/**
 * The shared Isolate was disposed mid-run (memory limit / OOM). The isolate is
 * unrecoverable and every scope on it is dead, so this must **terminate the whole
 * workflow execution** rather than route to a node's onError.
 */
export class AirlockTerminationError extends Error {
    constructor(message = "Airlock isolate disposed (memory limit exceeded)") {
        super(message);
        this.name = Airlock.TERMINATION_ERROR_NAME;
    }
}
