import { Vertex } from "./graph";

export class S2EngineError extends Error {
    constructor(message: string) {
        super(message);

        Object.setPrototypeOf(this, S2EngineError.prototype);
        this.name = this.constructor.name;
    }
}

export class S2EngineKilledError extends S2EngineError {
    constructor() {
        super("Engine was killed");

        Object.setPrototypeOf(this, S2EngineKilledError.prototype);
        this.name = this.constructor.name;
    }
}

export class S2EngineXORCollisionError extends S2EngineError {
    constructor(collidedVertices: Vertex.Id[], xorVertex: Vertex.Id) {
        super(`Vertices: ${collidedVertices.join(", ")} collided into vertex with XOR strategy "${xorVertex}"`);

        Object.setPrototypeOf(this, S2EngineXORCollisionError.prototype);
        this.name = this.constructor.name;
    }
}


export class S2EngineShortCircuitError extends S2EngineError {
    constructor(vertexId: Vertex.Id, runCount: number) {
        super(`Short circuit detected: vertex ${vertexId} fired ${runCount} times in rapid succession`);

        Object.setPrototypeOf(this, S2EngineShortCircuitError.prototype);
        this.name = this.constructor.name;
    }
}