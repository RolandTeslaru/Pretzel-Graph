import { S2EngineError, S2EngineKilledError, S2EngineXORCollisionError } from "./errors";
import { S2Graph, Vertex } from "./graph";
import { S2ExecutionState, S2Hooks } from "./types";

// Bulk Asynchronous Parallel Directed Cyclical Signal based Graph Engine

// S² Engine (Super Solenoid Engine from Neon Genesis Evangelion)

// or Super Signal Engine ( simmilar to super steps in Pregel)

export class S2Engine {
    constructor() { }

    public async ignite(graph: S2Graph, hooks: S2Hooks): Promise<any> {
        return new Promise((resolve, reject) => {
            const startVertex = graph.vertices.get("__START__" as Vertex.Id);

            if (!startVertex)
                throw new S2EngineError("Engine ignited without a __START__ vertex");

            const state: S2ExecutionState = {
                accumulatedSignals: new Map(),
                activeTasks: 0,
                settled: false
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
        if (state.settled) return;

        state.activeTasks ++;
        hooks.onVertexFired?.(vertexId);

        try {
            const signalSet = await hooks.onVertexExecute(vertexId);

            if (state.settled) return;

            hooks.onVertexCompleted?.(vertexId);

            const allDependents = graph.dependentsMap.get(vertexId)!;
            const dependents = signalSet ?? allDependents;

            dependents.forEach(dep => {
                if (state.settled) return;

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
            if (!state.settled) {
                state.settled = true;
                hooks.onVertexError?.(vertexId, err);
                reject(err);
            }
        }
        finally {
            state.activeTasks --;

            if(state.activeTasks === 0 && !state.settled){
                state.settled = true;
                resolve("Finished");
            }
        }
    }
}
