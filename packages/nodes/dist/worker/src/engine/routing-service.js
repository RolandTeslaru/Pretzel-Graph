"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoutingService = void 0;
const framework_fields_1 = require("./framework-fields");
/**
 * Routing decisions: which downstream branches a router node took
 * (`resolveRouterSignals`) and whether a node's dependency gates are satisfied
 * (`canRunByDependencies`). Dispatch lives in PropagationService / SchedulerService.
 */
class RoutingService {
    engine;
    constructor(engine) {
        this.engine = engine;
    }
    resolveRouterSignals(ctx, nodeId, result) {
        const signals = new Set();
        const edges = ctx.workflowCache.edges;
        const returnedKeys = new Set(Object.keys(result));
        for (const edge of Object.values(edges))
            if (edge.source.nodeId === nodeId && returnedKeys.has(edge.source.portId))
                signals.add(edge.target.nodeId);
        return signals;
    }
    /**
     * Dependency gating for `canNodeRun` (error-envelope short-circuit stays in the
     * engine). `signalDependency=AND` runs immediately; `dataDependency=AND` waits while
     * any wired input port has not produced data yet.
     */
    canRunByDependencies(ctx, vertexId) {
        const entry = this.engine.nodeRuntimeMap.get(vertexId);
        if (!entry)
            return true;
        const { instance, wfNode } = entry;
        const signalDep = (0, framework_fields_1.frameworkFields)(instance)["signalDependency"];
        const dataDep = (0, framework_fields_1.frameworkFields)(instance)["dataDependency"];
        if (signalDep === "AND")
            return true;
        if (dataDep === "AND") {
            // Wait only while a wired port has NOT received data yet (=== undefined).
            //   undefined → nothing produced yet            → keep waiting
            //   null      → nothing will come               → settled, proceed
            //   any value → arrived                         → proceed
            // A router-skipped branch leaves its port undefined and never signals;
            // the node stays waiting and the engine settles once nothing can run.
            const dependencies = ctx.compiledGraph.dependenciesMap.get(vertexId);
            const incomingInputs = this.engine.services.nodeIO.getIncomingData(ctx, wfNode.id, dependencies, true);
            const incomingEdgeByPort = ctx.workflowCache.inputHandlesMap[wfNode.id];
            for (const portId in incomingInputs) {
                const edgeId = incomingEdgeByPort?.[portId];
                const isWired = !!edgeId && !!ctx.workflowCache.edges[edgeId];
                if (isWired && incomingInputs[portId] === undefined)
                    return false;
            }
        }
        return true;
    }
}
exports.RoutingService = RoutingService;
