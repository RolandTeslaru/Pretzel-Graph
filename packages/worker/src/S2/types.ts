import { z } from "zod";
import { S2Graph, Vertex } from "./graph";

export namespace Arc {
    export const Id = z.string().brand("ArcId");
    export type Id = z.infer<typeof Arc.Id>;

    export function createId(sourceVertexId: Vertex.Id, targetVertexId: Vertex.Id) {
        return `${sourceVertexId}:${targetVertexId}` as Arc.Id;
    }
}

export interface S2Hooks {
    onVertexExecute(vertexId: Vertex.Id, signals: Set<Vertex.Id>): Promise<Set<Vertex.Id> | void>;
    onVertexWaiting?(vertexId: Vertex.Id, arrivedSignals: Set<Vertex.Id>, dependencyResolutionMap: Record<Vertex.Id, boolean>, totalDeps: number): void;
    onVertexFired?(vertexId: Vertex.Id): void;
    onVertexCompleted?(vertexId: Vertex.Id, resolvedOutSignals: Set<Vertex.Id> | void): void | Promise<void>;
    onVertexError?(vertexId: Vertex.Id, error: unknown): void;
    canVertexRun?(vertexId: Vertex.Id, signals: Set<Vertex.Id>, s2EngineAssesment: boolean): boolean;
    onKilled?(): void;
}

export interface S2ExecutionContext {
    graph: S2Graph;
    accumulatedSignals: Map<Vertex.Id, Set<Vertex.Id>>;
    activeTasks: number;
    activeVertexes: number;
    settled: boolean;
    resolve: (value: unknown) => void;
    reject: (reason?: any) => void;
    hooks: S2Hooks;
}