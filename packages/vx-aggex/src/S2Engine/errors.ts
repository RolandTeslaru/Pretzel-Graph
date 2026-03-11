import { Vertex } from "./graph";

export class S2EngineError extends Error {
    constructor(message: string) {
        super(message);

        Object.setPrototypeOf(this, S2EngineError.prototype);
        this.name = this.constructor.name;
    }
}

export class S2EngineXORColisionError extends Error {
    constructor(coliededVertices: Vertex.Id[], xorVertex: Vertex.Id) {
        super(`Vertices: ${coliededVertices.join(", ")} collided into vertex with XOR strategy "${xorVertex}"`);

        Object.setPrototypeOf(this, S2EngineXORColisionError.prototype);
        this.name = this.constructor.name;
    }
}
