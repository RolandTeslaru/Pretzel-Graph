import { z } from "zod";
import { S2EngineError } from "./errors";



export class Vertex {
    private strategy: Vertex.STRATEGY = "AND";

    constructor(
        public readonly id: Vertex.Id
    ) {}

    public setStragety(newStartegy: Vertex.STRATEGY) {
        this.strategy = newStartegy;
    }

    public getStrategy(): Vertex.STRATEGY {
        return this.strategy;
    }

    public compute(): Promise<void> {
        throw new S2EngineError("Method 'compute' must be implemented.");
    }
}
export namespace Vertex {
    export const Id = z.string().brand("VertexId");
    export type Id = z.infer<typeof Vertex.Id>;

    export interface ComputeContext {
        superstepTurn: number;
        superstepSiblings: Set<Vertex.Id>;
    }
    
    export type STRATEGY = "AND" | "OR" | "XOR";
}

export class S2Graph {
    public vertices: Map<Vertex.Id, Vertex> = new Map()
    public arcs: Map<Vertex.Id, Set<Vertex.Id>> = new Map()

    public dependentsMap: Map<Vertex.Id, Set<Vertex.Id>> = new Map();
    public dependeciesMap: Map<Vertex.Id, Set<Vertex.Id>> = new Map();

    public addVertex(
        vertexId: string,
        computeFn: () => Promise<void>
    ) {
        const vertex = new Vertex(
            vertexId as Vertex.Id
        );
        vertex.compute = computeFn;
        this.vertices.set(vertex.id, vertex)

        this.arcs.set(vertex.id, new Set());

        this.dependeciesMap.set(vertexId as Vertex.Id, new Set<Vertex.Id>())
        this.dependentsMap.set(vertexId as Vertex.Id, new Set<Vertex.Id>())
    }

    public addDependency(
        sourceVertexId: string,
        targetVertexId: string
    ) {
        const sourceVertex = this.vertices.get(sourceVertexId as Vertex.Id)
        const targetVertex = this.vertices.get(targetVertexId as Vertex.Id)

        if (!sourceVertex || !targetVertex) {
            throw new S2EngineError("Vertex not found");
        }

        const arcs = this.arcs.get(sourceVertex.id)!;
        arcs.add(targetVertex.id);

        this.dependentsMap.get(sourceVertex.id)!.add(targetVertex.id)

        this.dependeciesMap.get(targetVertex.id)!.add(sourceVertex.id);
    }
}
