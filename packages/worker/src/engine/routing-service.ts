import { Workflow } from "@pretzel-graph/shared/domain/Workflow";
import { Vertex } from "../S2/graph";
import { Port } from "@pretzel-graph/shared/domain/Foundations/Port";
import { Field } from "@pretzel-graph/shared/domain/Foundations/Field";
import type { AggexEngine } from "./index";

/**
 * Routing decisions: which downstream branches a router node took
 * (`resolveRouterSignals`) and whether a node's dependency gates are satisfied
 * (`canRunByDependencies`). Dispatch lives in PropagationService / SchedulerService.
 */
export class RoutingService {
    constructor(private engine: AggexEngine) {}


    public resolveRouterSignals(
        ctx:    AggexEngine.Execution.Context,
        nodeId: Workflow.Node.Id,
        result: Record<string, any>
    ): Set<Vertex.Id> {
        const signals = new Set<Vertex.Id>();
        const edges = ctx.workflowCache.edges;
        const returnedKeys = new Set(Object.keys(result));

        for (const edge of Object.values(edges))
            if (edge.source.nodeId === nodeId && returnedKeys.has(edge.source.portId))
                signals.add(edge.target.nodeId as unknown as Vertex.Id);

        return signals;
    }


    /**
     * Dependency gating for `canNodeRun` (error-envelope short-circuit stays in the
     * engine). `signalDependency=AND` runs immediately; `dataDependency=AND` waits while
     * any wired input port has not produced data yet.
     */
    public canRunByDependencies(
        ctx:      AggexEngine.Execution.Context,
        vertexId: Vertex.Id,
    ): boolean {
        const entry = this.engine.nodeRuntimeMap.get(vertexId);
        if (!entry) return true;

        const { instance, wfNode } = entry;

        const signalDep = instance.fieldValues["signalDependency" as Field.Id];
        const dataDep   = instance.fieldValues["dataDependency" as Field.Id];

        if(signalDep === "AND")
            return true;

        if(dataDep === "AND"){
            // Wait only while a wired port has NOT received data yet (=== undefined).
            //   undefined → nothing produced yet            → keep waiting
            //   null      → nothing will come               → settled, proceed
            //   any value → arrived                         → proceed
            // A router-skipped branch leaves its port undefined and never signals;
            // the node stays waiting and the engine settles once nothing can run.
            const dependencies       = ctx.compiledGraph.dependenciesMap.get(vertexId)!;
            const incomingInputs     = this.engine.services.nodeIO.getIncomingData(ctx, wfNode.id, dependencies, true);
            const incomingEdgeByPort = ctx.workflowCache.inputHandlesMap[wfNode.id];

            for (const portId in incomingInputs) {
                const edgeId  = incomingEdgeByPort?.[portId as Port.Input.Id];
                const isWired = !!edgeId && !!ctx.workflowCache.edges[edgeId];

                if (isWired && incomingInputs[portId as Port.Input.Id] === undefined)
                    return false;
            }
        }

        return true;
    }
}
