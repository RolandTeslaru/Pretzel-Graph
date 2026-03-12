import { z } from "zod";
import { S2EngineError } from "./errors";



export class Vertex {
    private strategy: Vertex.STRATEGY = "AND";

    constructor(
        public readonly id: Vertex.Id,
        strategy: Vertex.STRATEGY = "AND"
    ) {
        if(strategy)
            this.strategy = strategy;
    }

    public setStrategy(newStrategy: Vertex.STRATEGY) {
        this.strategy = newStrategy;
    }

    public getStrategy(): Vertex.STRATEGY {
        return this.strategy;
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
    public dependenciesMap: Map<Vertex.Id, Set<Vertex.Id>> = new Map();

    public addVertex(
        vertexId: string,
        strategy?: Vertex.STRATEGY
    ) {
        const vertex = new Vertex(
            vertexId as Vertex.Id,
            strategy
        );
        this.vertices.set(vertex.id, vertex)

        this.arcs.set(vertex.id, new Set());

        this.dependenciesMap.set(vertexId as Vertex.Id, new Set<Vertex.Id>())
        this.dependentsMap.set(vertexId as Vertex.Id, new Set<Vertex.Id>())
    }

    public setVertexStrategy(vertexId: Vertex.Id, strategy: Vertex.STRATEGY){
        const vertex = this.vertices.get(vertexId);

        if (!vertex) {
            throw new S2EngineError("Vertex not found");
        }

        vertex.setStrategy(strategy);
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

        this.dependenciesMap.get(targetVertex.id)!.add(sourceVertex.id);
    }
}
