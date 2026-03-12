import { Vertex } from "./graph";

export class S2EngineError extends Error {
    constructor(message: string) {
        super(message);

        Object.setPrototypeOf(this, S2EngineError.prototype);
        this.name = this.constructor.name;
    }
}

export class S2EngineXORCollisionError extends Error {
    constructor(collidedVertices: Vertex.Id[], xorVertex: Vertex.Id) {
        super(`Vertices: ${collidedVertices.join(", ")} collided into vertex with XOR strategy "${xorVertex}"`);

        Object.setPrototypeOf(this, S2EngineXORCollisionError.prototype);
        this.name = this.constructor.name;
    }
}
