import { S2EngineError, S2EngineXORColisionError } from "./errors";
import { S2Graph, Vertex } from "./graph";

// Bulk Asynchronous Parallel Directed Cyclical Graph Engine

export interface S2ExecutionState {
    accumulatedSignals: Map<Vertex.Id, Set<Vertex.Id>>;
    activeTasks: number;
}

export class S2Engine {
    constructor() { }

    public async ignite(graph: S2Graph) {   
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

            this.fireVertex(startVertex.id, graph, state, resolve, reject);
        })
    }

    private canVertexRun(vertexId: Vertex.Id, graph: S2Graph, state: S2ExecutionState, reject: (reason?: any) => void): boolean {
        const dependencies = graph.dependeciesMap.get(vertexId)!;
        const vertex = graph.vertices.get(vertexId);

        if (!vertex) 
            throw new S2EngineError(`Could not verify vertex ${vertexId}.`);

        const receivedSignals = state.accumulatedSignals.get(vertexId)!;

        switch (vertex.getStrategy()) {
            case "OR":
                // OR fires if AT LEAST ONE dependency has signaled
                return receivedSignals.size > 0;

            case "XOR":
                // XOR fires if EXACTLY ONE dependency has signaled
                if (receivedSignals.size > 1) {
                    reject(new S2EngineXORColisionError(Array.from(receivedSignals), vertexId));
                    return false;
                }
                return receivedSignals.size === 1;

            case "AND":
                // AND fires if ALL dependencies have signaled
                return receivedSignals.size === dependencies.size;

            default:
                return false;
        }
    }

    private async fireVertex(
        vertexId: Vertex.Id, 
        graph: S2Graph,
        state: S2ExecutionState,
        resolve: (value: unknown) => void, 
        reject: (reason?: any) => void
    ){
        const vertex = graph.vertices.get(vertexId)!;

        state.activeTasks ++;

        try {
            await vertex.compute();

            const dependents = graph.dependentsMap.get(vertexId)!

            dependents.forEach(dep => {
                const signals = state.accumulatedSignals.get(dep)!;
                signals.add(vertexId);
                const canDependentRun = this.canVertexRun(dep, graph, state, reject);

                // If it can run, then it will probably be triggered by another signal
                if(canDependentRun){
                    signals.clear();
                    this.fireVertex(dep, graph, state, resolve, reject);
                }
            })
        } 
        catch (err){
            console.error(`Vertex ${vertexId} failed:`, err);
            reject(err);
        } 
        finally {
            state.activeTasks --;

            if(state.activeTasks === 0)
                resolve("Finshed");
        }
    }

    public pause() {

    }

    public reignite() {

    }

    public kill() {

    }
}
