"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.S2Engine = void 0;
const errors_1 = require("./errors");
// Bulk Asynchronous Parallel Directed Cyclical Signal based Graph Engine
// S² Engine (Super Solenoid Engine from Neon Genesis Evangelion)
// or Super Signal Engine ( sounds simmilar to super steps in Pregel)
class S2Engine {
    static MAX_VERTEX_EXECUTION_DELTA = 1;
    static MAX_VERTEX_RUN_COUNT = 20;
    ctx;
    constructor() { }
    async ignite(graph, hooks) {
        if (this.ctx && !this.ctx.settled)
            throw new errors_1.S2EngineError("Engine is already running");
        return new Promise((resolve, reject) => {
            const startVertex = graph.vertices.get("__START__");
            if (!startVertex)
                throw new errors_1.S2EngineError("Engine ignited without a __START__ vertex");
            this.ctx = {
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
                this.ctx.accumulatedSignals.set(vertexId, new Set());
            }
            this.fireVertex(startVertex.id, new Set());
        });
    }
    assertVertexExists(vertexId) {
        if (!this.ctx.graph.vertices.has(vertexId))
            throw new errors_1.S2EngineError(`Vertex ${vertexId} not found`);
    }
    canVertexRun(vertexId) {
        const dependencies = this.ctx.graph.dependenciesMap.get(vertexId);
        const vertex = this.ctx.graph.vertices.get(vertexId);
        if (!vertex)
            throw new errors_1.S2EngineError(`Could not verify vertex ${vertexId}.`);
        const receivedSignals = this.ctx.accumulatedSignals.get(vertexId);
        let assesment = false;
        switch (vertex.getStrategy()) {
            case "OR":
                if (receivedSignals.size > 0)
                    assesment = true;
                break;
            case "XOR":
                if (receivedSignals.size > 1) {
                    this.ctx.settled = true;
                    this.ctx.reject(new errors_1.S2EngineXORCollisionError(Array.from(receivedSignals), vertexId));
                    assesment = false;
                }
                assesment = receivedSignals.size === 1;
                break;
            case "AND":
                assesment = receivedSignals.size === dependencies.size;
                break;
            default:
                throw new errors_1.S2EngineError(`Vertex ${vertexId} has an unknown signal execution strategy: ${vertex.getStrategy()}`);
        }
        if (this.ctx.hooks.canVertexRun)
            assesment = assesment && this.ctx.hooks.canVertexRun(vertexId, new Set(receivedSignals), assesment);
        return assesment;
    }
    fireVertexDependents(vertexId, signalSet) {
        const allDependents = this.ctx.graph.dependentsMap.get(vertexId);
        const dependents = signalSet ?? allDependents;
        // console.log("Firing dependents of vertex", vertexId, "with signal set", signalSet, "resulting in dependents", dependents);
        dependents.forEach(dep => {
            if (this.ctx.settled)
                return;
            this.ctx.accumulatedSignals.get(dep).add(vertexId);
            this.scheduleVertexCheck(dep);
        });
    }
    scheduleVertexCheck(dep) {
        if (this.ctx.pendingVertexChecks.has(dep))
            return;
        this.ctx.pendingVertexChecks.add(dep);
        queueMicrotask(() => {
            this.ctx.pendingVertexChecks.delete(dep);
            if (this.ctx.settled)
                return;
            try {
                const signals = this.ctx.accumulatedSignals.get(dep);
                if (this.canVertexRun(dep)) {
                    const firingSignals = new Set(signals);
                    signals.clear();
                    this.fireVertex(dep, firingSignals);
                }
                else {
                    const allDeps = this.ctx.graph.dependenciesMap.get(dep);
                    const resolutionMap = {};
                    for (const depId of allDeps) {
                        resolutionMap[depId] = signals.has(depId);
                    }
                    this.ctx.hooks.onVertexWaiting?.(dep, new Set(signals), resolutionMap, allDeps.size);
                }
            }
            catch (err) {
                // A throw in canVertexRun / onVertexFired / onVertexWaiting would
                // otherwise escape this microtask as an uncaught exception and kill
                // the whole worker process. Reject the run so it fails as a job.
                if (!this.ctx.settled) {
                    this.ctx.settled = true;
                    this.ctx.hooks.onVertexError?.(dep, err);
                    this.ctx.reject(err);
                }
            }
            finally {
                // A dependency check can end without firing a vertex. In that case there is
                // no fireVertex.finally to settle the engine after this pending check is removed.
                this.trySettle();
            }
        });
    }
    async fireVertex(vertexId, signals) {
        // console.log("Attempting to fire vertex", vertexId, "with incoming signals", signals);
        if (this.ctx.settled)
            return;
        this.ctx.activeTasks++;
        this.ctx.activeVertexes++;
        this.ctx.hooks.onVertexFired?.(vertexId);
        try {
            const vertex = this.ctx.graph.vertices.get(vertexId);
            if (!vertex)
                throw new errors_1.S2EngineError(`Attempted to fire non-existent vertex ${vertexId}.`);
            vertex.track();
            if (this.isShortCircuiting(vertexId)) {
                this.ctx.settled = true;
                const err = new errors_1.S2EngineShortCircuitError(vertexId, vertex.getRunCount());
                this.ctx.hooks.onVertexError?.(vertexId, err);
                this.ctx.reject(err);
                return;
            }
            const signalSet = await this.ctx.hooks.onVertexExecute(vertexId, signals);
            this.ctx.activeVertexes--;
            if (this.ctx.settled)
                return;
            await this.ctx.hooks.onVertexCompleted?.(vertexId, signalSet);
            // Dependents are fired without await — this is intentional.                                                                                                               
            // Parallel branches run concurrently; `activeTasks` tracks settlement.                                                                                                    
            // All code paths check `ctx.settled` to guard against post-resolution side effects. 
            this.fireVertexDependents(vertexId, signalSet);
        }
        catch (err) {
            if (!this.ctx.settled) {
                this.ctx.settled = true;
                this.ctx.hooks.onVertexError?.(vertexId, err);
                this.ctx.reject(err);
            }
        }
        finally {
            this.ctx.activeTasks--;
            this.trySettle();
        }
    }
    overrides = {
        fireVertex: (vertexId, signals = new Set()) => {
            this.fireVertex(vertexId, signals);
        },
        addSignal: (targetVertexId, sourceVertexId) => {
            if (this.ctx.settled)
                throw new errors_1.S2EngineError("Engine is not running");
            this.assertVertexExists(targetVertexId);
            this.assertVertexExists(sourceVertexId);
            this.ctx.accumulatedSignals.get(targetVertexId).add(sourceVertexId);
            this.scheduleVertexCheck(targetVertexId);
        },
        removeSignal: (targetVertexId, sourceVertexId) => {
            if (this.ctx.settled)
                throw new errors_1.S2EngineError("Engine is not running");
            this.assertVertexExists(targetVertexId);
            this.assertVertexExists(sourceVertexId);
            this.ctx.accumulatedSignals.get(targetVertexId).delete(sourceVertexId);
        },
        clearSignals: (vertexId) => {
            if (this.ctx.settled)
                throw new errors_1.S2EngineError("Engine is not running");
            this.assertVertexExists(vertexId);
            this.ctx.accumulatedSignals.get(vertexId).clear();
        },
        scheduleCheck: (vertexId) => {
            if (this.ctx.settled)
                throw new errors_1.S2EngineError("Engine is not running");
            this.assertVertexExists(vertexId);
            this.scheduleVertexCheck(vertexId);
        },
    };
    isShortCircuiting(vertexId) {
        const vertex = this.ctx.graph.vertices.get(vertexId);
        if (!vertex)
            throw new errors_1.S2EngineError(`Attempted to assess short-circuiting on non-existent vertex ${vertexId}.`);
        return vertex.deltaExecution < S2Engine.MAX_VERTEX_EXECUTION_DELTA && vertex.getRunCount() > S2Engine.MAX_VERTEX_RUN_COUNT;
    }
    trySettle() {
        if (!this.ctx.settled && this.ctx.activeTasks === 0 && this.ctx.pendingVertexChecks.size === 0) {
            this.ctx.settled = true;
            this.ctx.resolve("completed");
        }
    }
}
exports.S2Engine = S2Engine;
