"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseError = exports.SystemError = void 0;
const zod_1 = __importDefault(require("zod"));
class SystemError extends Error {
    code;
    detail;
    data;
    constructor(code, message, opts) {
        super(message);
        this.code = code;
        this.detail = opts?.detail;
        this.data = opts?.data;
        this.name = "SystemError";
        Object.setPrototypeOf(this, SystemError.prototype);
    }
    /** Serialize to plain JSON for the wire (Redis, WebSocket, HTTP). */
    toJSON() {
        return {
            code: this.code,
            message: this.message,
            ...(this.detail !== undefined && { detail: this.detail }),
            ...(this.data !== undefined && { data: this.data }),
        };
    }
    /** Wrap any caught value into a SystemError. Already a SystemError? Return as-is. */
    static fromUnknown(err, fallbackCode) {
        if (err instanceof SystemError)
            return err;
        // Axios error — extract SystemError.Serialized from response if present
        if (typeof err === "object" && err !== null && "response" in err) {
            const serialized = err.response?.data?.error;
            if (serialized?.code !== undefined && serialized?.message) {
                return new SystemError(serialized.code, serialized.message, {
                    detail: serialized.detail,
                    data: serialized.data,
                });
            }
        }
        // Unknown error — preserve the original message, stack goes in detail
        const message = err instanceof Error ? err.message : String(err);
        const detail = err instanceof Error ? err.stack : undefined;
        return new SystemError(fallbackCode ?? SystemError.Code.INFRA_UNKNOWN, message, { detail });
    }
}
exports.SystemError = SystemError;
/** Infrastructure / database errors. */
class DatabaseError extends SystemError {
    constructor(code, message, opts) {
        super(code, message, opts);
        this.name = "DatabaseError";
        Object.setPrototypeOf(this, DatabaseError.prototype);
    }
}
exports.DatabaseError = DatabaseError;
(function (SystemError) {
    // ── Error Codes ────────────────────────────────────────────────
    let Code;
    (function (Code) {
        // Compilation (1xxx)
        Code[Code["COMPILATION_NODE_NOT_FOUND"] = 1001] = "COMPILATION_NODE_NOT_FOUND";
        Code[Code["COMPILATION_NO_START_NODES"] = 1002] = "COMPILATION_NO_START_NODES";
        Code[Code["COMPILATION_DEADLOCK_CYCLE"] = 1003] = "COMPILATION_DEADLOCK_CYCLE";
        Code[Code["COMPILATION_UNROUTED_CYCLE"] = 1004] = "COMPILATION_UNROUTED_CYCLE";
        Code[Code["COMPILATION_TRIVIAL_CYCLE"] = 1005] = "COMPILATION_TRIVIAL_CYCLE";
        Code[Code["COMPILATION_TYPE_MISMATCH"] = 1006] = "COMPILATION_TYPE_MISMATCH";
        Code[Code["COMPILATION_MISSING_REQUIRED_INPUT"] = 1007] = "COMPILATION_MISSING_REQUIRED_INPUT";
        Code[Code["COMPILATION_SUBWORKFLOW_CYCLE"] = 1008] = "COMPILATION_SUBWORKFLOW_CYCLE";
        Code[Code["COMPILATION_PROXY_UNSUPPORTED"] = 1009] = "COMPILATION_PROXY_UNSUPPORTED";
        Code[Code["COMPILATION_NOT_IGNITEABLE"] = 1010] = "COMPILATION_NOT_IGNITEABLE";
        // Execution (2xxx)
        Code[Code["EXECUTION_NODE_FAILED"] = 2001] = "EXECUTION_NODE_FAILED";
        Code[Code["EXECUTION_TIMEOUT"] = 2002] = "EXECUTION_TIMEOUT";
        Code[Code["EXECUTION_ENGINE_KILLED"] = 2003] = "EXECUTION_ENGINE_KILLED";
        Code[Code["EXECUTION_SIGNAL_OVERFLOW"] = 2004] = "EXECUTION_SIGNAL_OVERFLOW";
        Code[Code["EXECUTION_XOR_SIGNAL_COLLISION"] = 2005] = "EXECUTION_XOR_SIGNAL_COLLISION";
        Code[Code["EXECUTION_CYCLE_LIMIT_EXCEEDED"] = 2006] = "EXECUTION_CYCLE_LIMIT_EXCEEDED";
        Code[Code["EXECUTION_ACCUMULATOR_OVERFLOW"] = 2007] = "EXECUTION_ACCUMULATOR_OVERFLOW";
        Code[Code["EXECUTION_GRAPH_ABORTED"] = 2008] = "EXECUTION_GRAPH_ABORTED";
        Code[Code["EXECUTION_TYPE_MISMATCH"] = 2009] = "EXECUTION_TYPE_MISMATCH";
        Code[Code["EXECUTION_UNCAUGHT_NODE_ERROR"] = 2010] = "EXECUTION_UNCAUGHT_NODE_ERROR";
        Code[Code["EXECUTION_CYCLIC_ERROR_PROPAGATION"] = 2011] = "EXECUTION_CYCLIC_ERROR_PROPAGATION";
        // Configuration (3xxx)
        Code[Code["CONFIG_MISSING_CREDENTIAL"] = 3001] = "CONFIG_MISSING_CREDENTIAL";
        Code[Code["CONFIG_INVALID_FIELD"] = 3002] = "CONFIG_INVALID_FIELD";
        Code[Code["COMPILATION_MISSING_SUBWORKFLOW_DEPENDENCY"] = 3003] = "COMPILATION_MISSING_SUBWORKFLOW_DEPENDENCY";
        // Provider / External (4xxx)
        Code[Code["PROVIDER_API_ERROR"] = 4001] = "PROVIDER_API_ERROR";
        Code[Code["PROVIDER_RATE_LIMITED"] = 4002] = "PROVIDER_RATE_LIMITED";
        Code[Code["PROVIDER_AUTH_FAILED"] = 4003] = "PROVIDER_AUTH_FAILED";
        // Infrastructure (5xxx)
        Code[Code["INFRA_DATABASE_ERROR"] = 5001] = "INFRA_DATABASE_ERROR";
        Code[Code["INFRA_QUEUE_ERROR"] = 5002] = "INFRA_QUEUE_ERROR";
        Code[Code["INFRA_UNKNOWN"] = 5999] = "INFRA_UNKNOWN";
        // Request-shaped failures. Postgres SQLSTATEs map onto these — see
        // DatabaseClass in backend/src/decorators/transactional.ts.
        Code[Code["BAD_REQUEST"] = 400] = "BAD_REQUEST";
        Code[Code["FORBIDDEN"] = 403] = "FORBIDDEN";
        Code[Code["NOT_FOUND"] = 404] = "NOT_FOUND";
        Code[Code["CONFLICT"] = 409] = "CONFLICT";
    })(Code = SystemError.Code || (SystemError.Code = {}));
    // ── Serialized (wire format) ───────────────────────────────────
    SystemError.Schema = zod_1.default.object({
        code: zod_1.default.enum(Code),
        message: zod_1.default.string(),
        detail: zod_1.default.string().optional(),
        data: zod_1.default.unknown().optional(),
    });
    // ── Helpers ────────────────────────────────────────────────────
    /**
     * Extract the user-facing message from any caught error.
     * If the error is a SystemError (or carries one in an Axios response), returns its message.
     * Otherwise returns a generic fallback.
     */
    function messageFrom(err) {
        if (err instanceof SystemError)
            return err.message;
        // Axios error with SystemError.Serialized in response
        if (typeof err === "object" && err !== null && "response" in err) {
            const serialized = err.response?.data?.error;
            if (serialized?.message)
                return serialized.message;
        }
        return "Something went wrong";
    }
    SystemError.messageFrom = messageFrom;
})(SystemError || (exports.SystemError = SystemError = {}));
