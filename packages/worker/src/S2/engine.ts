import { S2EngineError, S2EngineKilledError, S2EngineXORCollisionError } from "./errors";
import { S2Graph, Vertex } from "./graph";
import { S2ExecutionContext, S2Hooks } from "./types";

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

            const ctx: S2ExecutionContext = {
                graph,
                accumulatedSignals: new Map(),
                activeTasks: 0,
                activeVertexes: 0,
                settled: false,
                resolve,
                reject,
                hooks
            };

            for (const vertexId of graph.vertices.keys()) {
                ctx.accumulatedSignals.set(vertexId, new Set());
            }

            this.fireVertex(startVertex.id, new Set(), ctx);
        })
    }

    private canVertexRun(
        vertexId: Vertex.Id,
        ctx: S2ExecutionContext
    ): boolean {
        const dependencies = ctx.graph.dependenciesMap.get(vertexId)!;
        const vertex = ctx.graph.vertices.get(vertexId);

        if (!vertex)
            throw new S2EngineError(`Could not verify vertex ${vertexId}.`);

        const receivedSignals = ctx.accumulatedSignals.get(vertexId)!;

        switch (vertex.getStrategy()) {
            case "OR":
                return receivedSignals.size > 0;

            case "XOR":
                if (receivedSignals.size > 1) {
                    ctx.reject(new S2EngineXORCollisionError(Array.from(receivedSignals), vertexId));
                    return false;
                }
                return receivedSignals.size === 1;

            case "AND":
                return receivedSignals.size === dependencies.size;

            default:
                throw new S2EngineError(`Vertex ${vertexId} has an unknown execution strategy: ${vertex.getStrategy()}`)
        }
    }



    private fireVertexDependents(
        vertexId: Vertex.Id,
        signalSet: Set<Vertex.Id> | void,
        ctx: S2ExecutionContext
    ) {
        const allDependents = ctx.graph.dependentsMap.get(vertexId)!;
        const dependents = signalSet ?? allDependents;
        console.log("Firing dependents of vertex", vertexId, "with signal set", signalSet, "resulting in dependents", dependents);

        dependents.forEach(dep => {
            if (ctx.settled) return;

            const signals = ctx.accumulatedSignals.get(dep)!;
            signals.add(vertexId);
            const canRun = this.canVertexRun(dep, ctx);

            console.log("Checking if dependent vertex", dep, "can run with accumulated signals", signals, "->", canRun);
            const copiedSignals = new Set(signals);

            if (canRun) {
                signals.clear();
                this.fireVertex(dep, copiedSignals, ctx);
            } else {
                const allDeps = ctx.graph.dependenciesMap.get(dep)!;
                const resolutionMap: Record<Vertex.Id, boolean> = {};
                for (const depId of allDeps) {
                    resolutionMap[depId] = signals.has(depId);
                }
                ctx.hooks.onVertexWaiting?.(dep, new Set(signals), resolutionMap, allDeps.size);
            }
        })
    }



    private async fireVertex(
        vertexId: Vertex.Id,
        signals: Set<Vertex.Id>,
        ctx: S2ExecutionContext
    ) {
        console.log("Attempting to fire vertex", vertexId, "with incoming signals", signals);
        if (ctx.settled) return;

        ctx.activeTasks++;
        ctx.activeVertexes ++;
        ctx.hooks.onVertexFired?.(vertexId);

        try {
            const signalSet = await ctx.hooks.onVertexExecute(vertexId, signals);

            ctx.activeVertexes --;

            if (ctx.settled) 
                return;

            await ctx.hooks.onVertexCompleted?.(vertexId);

            // Dependents are fired without await — this is intentional.                                                                                                               
            // Parallel branches run concurrently; `activeTasks` tracks settlement.                                                                                                    
            // All code paths check `ctx.settled` to guard against post-resolution side effects. 
            this.fireVertexDependents(vertexId, signalSet, ctx);
        }
        catch (err) {
            if (!ctx.settled) {
                ctx.settled = true;
                ctx.hooks.onVertexError?.(vertexId, err);
                ctx.reject(err);
            }
        }
        finally {
            ctx.activeTasks--;

            if (ctx.activeTasks === 0 && !ctx.settled) {
                console.log("All tasks completed, settling with success.", "Active vertexes at settlement:", ctx.activeVertexes, "vertexId at settlement:", vertexId);

                ctx.settled = true;
                ctx.resolve("Finished");
            }
        }
    }
}
