import { z } from "zod";
import { Vertex } from "./graph";

export namespace Arc {
    export const Id = z.string().brand("ArcId");
    export type Id = z.infer<typeof Arc.Id>;

    export function createId(sourceVertexId: Vertex.Id, targetVertexId: Vertex.Id) {
        return `${sourceVertexId}:${targetVertexId}` as Arc.Id;
    }
}

export interface S2Hooks {
    onVertexExecute(vertexId: Vertex.Id): Promise<Set<Vertex.Id> | void>;
    onVertexWaiting?(vertexId: Vertex.Id, dependencyResolutionMap: Record<Vertex.Id, boolean>, totalDeps: number): void;
    onVertexFired?(vertexId: Vertex.Id): void;
    onVertexCompleted?(vertexId: Vertex.Id): void;
    onVertexError?(vertexId: Vertex.Id, error: unknown): void;
    onKilled?(): void;
}

export interface S2ExecutionState {
    accumulatedSignals: Map<Vertex.Id, Set<Vertex.Id>>;
    activeTasks: number;
    settled: boolean;
}