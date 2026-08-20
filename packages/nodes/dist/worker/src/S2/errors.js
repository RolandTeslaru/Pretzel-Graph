"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.S2EngineShortCircuitError = exports.S2EngineXORCollisionError = exports.S2EngineKilledError = exports.S2EngineError = void 0;
class S2EngineError extends Error {
    constructor(message) {
        super(message);
        Object.setPrototypeOf(this, S2EngineError.prototype);
        this.name = this.constructor.name;
    }
}
exports.S2EngineError = S2EngineError;
class S2EngineKilledError extends S2EngineError {
    constructor() {
        super("Engine was killed");
        Object.setPrototypeOf(this, S2EngineKilledError.prototype);
        this.name = this.constructor.name;
    }
}
exports.S2EngineKilledError = S2EngineKilledError;
class S2EngineXORCollisionError extends S2EngineError {
    constructor(collidedVertices, xorVertex) {
        super(`Vertices: ${collidedVertices.join(", ")} collided into vertex with XOR strategy "${xorVertex}"`);
        Object.setPrototypeOf(this, S2EngineXORCollisionError.prototype);
        this.name = this.constructor.name;
    }
}
exports.S2EngineXORCollisionError = S2EngineXORCollisionError;
class S2EngineShortCircuitError extends S2EngineError {
    constructor(vertexId, runCount) {
        super(`Short circuit detected: vertex ${vertexId} fired ${runCount} times in rapid succession`);
        Object.setPrototypeOf(this, S2EngineShortCircuitError.prototype);
        this.name = this.constructor.name;
    }
}
exports.S2EngineShortCircuitError = S2EngineShortCircuitError;
