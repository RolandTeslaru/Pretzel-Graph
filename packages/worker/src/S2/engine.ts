import { S2EngineShortCircuitError, S2EngineError, S2EngineKilledError, S2EngineXORCollisionError } from "./errors";
import { S2Graph, Vertex } from "./graph";
import { S2Hooks } from "./types";

// Bulk Asynchronous Parallel Directed Cyclical Signal based Graph Engine

// S² Engine (Super Solenoid Engine from Neon Genesis Evangelion)

// or Super Signal Engine ( sounds simmilar to super steps in Pregel)

export class S2Engine {

    public static readonly MAX_VERTEX_EXECUTION_DELTA = 1;
    public static readonly MAX_VERTEX_RUN_COUNT = 20;

    constructor() { }




    public async ignite(
        graph: S2Graph, 
        hooks: S2Hooks
    ): Promise<S2Engine.ExecutionResult> {
        return new Promise<S2Engine.ExecutionResult>((resolve, reject) => {
            const startVertex = graph.vertices.get("__START__" as Vertex.Id);

            if (!startVertex)
                throw new S2EngineError("Engine ignited without a __START__ vertex");

            const ctx: S2Engine.ExecutionContext = {
                graph,
                accumulatedSignals: new Map(),
                activeTasks: 0,
                activeVertexes: 0,
                settled: false,
                startTime: performance.now(),
                resolve,
                reject,
                hooks,
                pendingVertexChecks: new Set(),
            };

            for (const vertexId of graph.vertices.keys()) {
                ctx.accumulatedSignals.set(vertexId, new Set());
            }

            this.fireVertex(startVertex.id, new Set(), ctx);
        })
    }




    private canVertexRun(
        vertexId: Vertex.Id,
        ctx:      S2Engine.ExecutionContext
    ): boolean {
        const dependencies = ctx.graph.dependenciesMap.get(vertexId)!;
        const vertex = ctx.graph.vertices.get(vertexId);

        if (!vertex)
            throw new S2EngineError(`Could not verify vertex ${vertexId}.`);

        const receivedSignals = ctx.accumulatedSignals.get(vertexId)!;

        let assesment: boolean = false;

        switch (vertex.getStrategy()) {
            case "OR":
                if(receivedSignals.size > 0)
                    assesment = true;
                break;

            case "XOR":
                if (receivedSignals.size > 1) {
                    ctx.reject(new S2EngineXORCollisionError(Array.from(receivedSignals), vertexId));
                    assesment = false;
                }
                assesment = receivedSignals.size === 1;
                break;

            case "AND":
                assesment = receivedSignals.size === dependencies.size;
                break;
            default:
                throw new S2EngineError(`Vertex ${vertexId} has an unknown signal execution strategy: ${vertex.getStrategy()}`)        
        }

        if(ctx.hooks.canVertexRun)
            assesment = assesment && ctx.hooks.canVertexRun(vertexId, new Set(receivedSignals), assesment);
        
        return assesment
    }




    private fireVertexDependents(
        vertexId:  Vertex.Id,
        signalSet: Set<Vertex.Id> | void,
        ctx:       S2Engine.ExecutionContext
    ) { 
        const allDependents = ctx.graph.dependentsMap.get(vertexId)!;
        const dependents = signalSet ?? allDependents;
        // console.log("Firing dependents of vertex", vertexId, "with signal set", signalSet, "resulting in dependents", dependents);

        dependents.forEach(dep => {
            if (ctx.settled) return;

            ctx.accumulatedSignals.get(dep)!.add(vertexId);
            this.scheduleVertexCheck(dep, ctx);
        })
    }

    
    private scheduleVertexCheck(dep: Vertex.Id, ctx: S2Engine.ExecutionContext) {
        if(ctx.pendingVertexChecks.has(dep)) 
            return;

        ctx.pendingVertexChecks.add(dep);

        queueMicrotask(() => {
            ctx.pendingVertexChecks.delete(dep);

            if(ctx.settled) return;

            const signals = ctx.accumulatedSignals.get(dep)!;

            if(this.canVertexRun(dep, ctx)){
                const firingSignals = new Set(signals);
                signals.clear();
                this.fireVertex(dep, firingSignals, ctx);
            } 
            else {
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
        signals:  Set<Vertex.Id>, // incoming signals that triggered this vertex to fire. For AND strategy, this will be the complete set of dependencies. For OR/XOR, this will be a subset of dependencies.
        ctx:      S2Engine.ExecutionContext
    ) {
        // console.log("Attempting to fire vertex", vertexId, "with incoming signals", signals);
        if (ctx.settled) return;

        ctx.activeTasks++;
        ctx.activeVertexes ++;
        ctx.hooks.onVertexFired?.(vertexId);

        const vertex = ctx.graph.vertices.get(vertexId);
        if (!vertex)
            throw new S2EngineError(`Attempted to fire non-existent vertex ${vertexId}.`);

        vertex.track();

        if(this.isShortCircuiting(vertexId, ctx)) {
            ctx.settled = true;
            const err = new S2EngineShortCircuitError(vertexId, vertex.getRunCount());
            ctx.hooks.onVertexError?.(vertexId, err);
            ctx.reject(err);
            return;
        }

        try {
            const signalSet = await ctx.hooks.onVertexExecute(vertexId, signals);

            ctx.activeVertexes --;

            if (ctx.settled) 
                return;

            await ctx.hooks.onVertexCompleted?.(vertexId, signalSet);

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

            this.trySettle(ctx);
        }
    }




    private isShortCircuiting(
        vertexId: Vertex.Id, 
        ctx:      S2Engine.ExecutionContext
    ): boolean {
        const vertex = ctx.graph.vertices.get(vertexId);
        if (!vertex)
            throw new S2EngineError(`Attempted to assess short-circuiting on non-existent vertex ${vertexId}.`);

        return vertex.deltaExecution < S2Engine.MAX_VERTEX_EXECUTION_DELTA && vertex.getRunCount() > S2Engine.MAX_VERTEX_RUN_COUNT;
    }



    private trySettle(ctx: S2Engine.ExecutionContext): void {
        if(!ctx.settled && ctx.activeTasks === 0 && ctx.pendingVertexChecks.size === 0){
            ctx.settled = true;
            ctx.resolve("completed");
        }
    }
}

export namespace S2Engine {
    export type ExecutionResult = "completed"

    export interface ExecutionContext {
        graph: S2Graph;
        accumulatedSignals: Map<Vertex.Id, Set<Vertex.Id>>;
        activeTasks: number;
        activeVertexes: number;
        settled: boolean;
        startTime: number;
        resolve: (value: ExecutionResult) => void;
        reject: (err: unknown) => void;
        hooks: S2Hooks;
        pendingVertexChecks: Set<Vertex.Id>; 
    }
}
