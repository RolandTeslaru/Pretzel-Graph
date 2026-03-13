import { S2EngineError, S2EngineKilledError, S2EngineXORCollisionError } from "./errors";
import { S2Graph, Vertex } from "./graph";

// Bulk Asynchronous Parallel Directed Cyclical Graph Engine

export interface S2Hooks {
    onVertexExecute(vertexId: Vertex.Id): Promise<void>;
    onVertexWaiting?(vertexId: Vertex.Id, dependencyResolutionMap: Record<Vertex.Id, boolean>, totalDeps: number): void;
    onVertexFired?(vertexId: Vertex.Id): void;
    onVertexCompleted?(vertexId: Vertex.Id): void;
    onVertexError?(vertexId: Vertex.Id, error: unknown): void;
    onKilled?(): void;
}

export interface S2ExecutionState {
    accumulatedSignals: Map<Vertex.Id, Set<Vertex.Id>>;
    activeTasks: number;
}

// S² Engine (Super Solenoid Engine from Neon Genesis Evangelion)
export class S2Engine {
    private killed = false;

    constructor() { }

    public async ignite(graph: S2Graph, hooks: S2Hooks) {
        this.killed = false;

        return new Promise((resolve, reject) => {
            const startVertex = graph.vertices.get("__START__" as Vertex.Id);

            if (!startVertex)
                throw new S2EngineError("Engine ignited without a __START__ vertex");

            const state: S2ExecutionState = {
                accumulatedSignals: new Map(),
                activeTasks: 0
            };

            for (const vertexId of graph.vertices.keys()) {
                state.accumulatedSignals.set(vertexId, new Set());
            }

            this.fireVertex(startVertex.id, graph, state, resolve, reject, hooks);
        })
    }

    private canVertexRun(
        vertexId: Vertex.Id,
        graph: S2Graph,
        state: S2ExecutionState,
        reject: (reason?: any) => void
    ): boolean {
        if (this.killed) return false;

        const dependencies = graph.dependenciesMap.get(vertexId)!;
        const vertex = graph.vertices.get(vertexId);

        if (!vertex)
            throw new S2EngineError(`Could not verify vertex ${vertexId}.`);

        const receivedSignals = state.accumulatedSignals.get(vertexId)!;

        switch (vertex.getStrategy()) {
            case "OR":
                return receivedSignals.size > 0;

            case "XOR":
                if (receivedSignals.size > 1) {
                    reject(new S2EngineXORCollisionError(Array.from(receivedSignals), vertexId));
                    return false;
                }
                return receivedSignals.size === 1;

            case "AND":
                return receivedSignals.size === dependencies.size;

            default:
                throw new S2EngineError(`Vertex ${vertexId} has an unknown execution strategy: ${vertex.getStrategy()}`)
        }
    }

    private async fireVertex(
        vertexId: Vertex.Id,
        graph: S2Graph,
        state: S2ExecutionState,
        resolve: (value: unknown) => void,
        reject: (reason?: any) => void,
        hooks: S2Hooks
    ){
        if (this.killed) {
            if (state.activeTasks === 0) resolve("Killed");
            return;
        }

        state.activeTasks ++;
        hooks.onVertexFired?.(vertexId);

        try {
            await hooks.onVertexExecute(vertexId);

            if (this.killed) return;

            hooks.onVertexCompleted?.(vertexId);

            const dependents = graph.dependentsMap.get(vertexId)!

            dependents.forEach(dep => {
                if (this.killed) 
                    return;

                const signals = state.accumulatedSignals.get(dep)!;
                signals.add(vertexId);
                const canRun = this.canVertexRun(dep, graph, state, reject);

                if(canRun){
                    signals.clear();
                    this.fireVertex(dep, graph, state, resolve, reject, hooks);
                } else {
                    const allDeps = graph.dependenciesMap.get(dep)!;
                    const resolutionMap: Record<Vertex.Id, boolean> = {};
                    for (const depId of allDeps) {
                        resolutionMap[depId] = signals.has(depId);
                    }
                    hooks.onVertexWaiting?.(dep, resolutionMap, allDeps.size);
                }
            })
        }
        catch (err){
            if (this.killed) return;
            hooks.onVertexError?.(vertexId, err);
            console.error(`Vertex ${vertexId} failed:`, err);
            reject(err);
        }
        finally {
            state.activeTasks --;

            if (this.killed && state.activeTasks === 0) {
                hooks.onKilled?.();
                resolve("Killed");
            }
            else if(state.activeTasks === 0)
                resolve("Finished");
        }
    }

    public kill() {
        this.killed = true;
    }
}
