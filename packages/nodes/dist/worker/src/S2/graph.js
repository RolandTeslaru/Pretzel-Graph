"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.S2Graph = exports.RouterVertex = exports.Vertex = void 0;
const zod_1 = require("zod");
const errors_1 = require("./errors");
class Vertex {
    id;
    strategy = "AND";
    runCount = 0;
    lastExecutionTime = 0;
    deltaExecution = Infinity;
    static MAX_RUN_COUNT = 100;
    constructor(id, strategy = "AND") {
        this.id = id;
        if (strategy)
            this.strategy = strategy;
    }
    setStrategy(newStrategy) {
        this.strategy = newStrategy;
    }
    getStrategy() {
        return this.strategy;
    }
    track() {
        this.runCount++;
        if (this.runCount > Vertex.MAX_RUN_COUNT)
            throw new errors_1.S2EngineError(`Vertex ${this.id} has exceeded the maximum run count.`);
        const now = performance.now();
        this.deltaExecution = (now - this.lastExecutionTime) / 1000;
        this.lastExecutionTime = now;
    }
    getRunCount() {
        return this.runCount;
    }
}
exports.Vertex = Vertex;
class RouterVertex extends Vertex {
    constructor(...args) {
        super(...args);
    }
}
exports.RouterVertex = RouterVertex;
(function (Vertex) {
    Vertex.Id = zod_1.z.string().brand("VertexId");
})(Vertex || (exports.Vertex = Vertex = {}));
class S2Graph {
    vertices = new Map();
    arcs = new Map();
    dependentsMap = new Map();
    dependenciesMap = new Map();
    static START_VERTEX_ID = "__START__";
    addVertex(vertexId, strategy) {
        const vertex = new Vertex(vertexId, strategy);
        this.vertices.set(vertex.id, vertex);
        this.arcs.set(vertex.id, new Set());
        this.dependenciesMap.set(vertexId, new Set());
        this.dependentsMap.set(vertexId, new Set());
    }
    setVertexStrategy(vertexId, strategy) {
        const vertex = this.vertices.get(vertexId);
        if (!vertex)
            throw new errors_1.S2EngineError("Vertex not found");
        vertex.setStrategy(strategy);
    }
    addDependency(sourceVertexId, targetVertexId) {
        const sourceVertex = this.vertices.get(sourceVertexId);
        const targetVertex = this.vertices.get(targetVertexId);
        if (!sourceVertex || !targetVertex)
            throw new errors_1.S2EngineError("Vertex not found");
        const arcs = this.arcs.get(sourceVertex.id);
        arcs.add(targetVertex.id);
        this.dependentsMap.get(sourceVertex.id).add(targetVertex.id);
        this.dependenciesMap.get(targetVertex.id).add(sourceVertex.id);
    }
}
exports.S2Graph = S2Graph;
