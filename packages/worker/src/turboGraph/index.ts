/*
 * PretzelGraph — https://github.com/RolandTeslaru/Pretzel-Graph
 * PolyForm Noncommercial License 1.0.0. Commercial use requires a separate license.
 * PZG-src::9f3a1c
 */
import { Airlock, Execution, Foundations, Realtime, Vault } from "@pretzel-graph/shared/domain";
import { SystemError } from "@pretzel-graph/shared/domain/SystemError";
import { Workflow } from "@pretzel-graph/shared/domain/Workflow";
import { CatalogueService, HTTP, NetworkProxy, RuntimeNode, mapFieldValues } from "@pretzel-graph/node-sdk";
import { Blueprint } from "@pretzel-graph/shared/domain/Foundations/Blueprint";

import { AggexCompilerError } from "../errors";
import { AirlockService } from "../airlock";
import { S2Graph, Vertex } from "../S2/graph";
import { isUUID } from "../utils";

import { AggexEngine } from "src/engine";
import { Field } from "@pretzel-graph/shared/domain/Foundations/Field";
import { RealtimeService } from "../realtime";
import { createContexts } from "./contexts";


// Turns stored Workflow.Data into a runnable execution context. compile() in order:
//
//   1. Resolve every node's blueprint via CatalogueService — load, derive, or fall back to a
//      subworkflow dependency — into a map keyed the way createCache indexes it.
//   2. Build the Workflow.Cache (resolved port/field shapes, fat edges) off those blueprints.
//   3. Create the S2Graph and its START vertex.
//   4. Register the workflow with the airlock sandbox.
//   5. Build the node + engine execution contexts, wiring the API facade nodes receive.
//   6. prepareNode per enabled node: instantiate its RuntimeNode class, register it with the
//      engine, add its vertex, and set the AND/OR signal strategy.
//   7. Warm the expression cache (needs step 6's resolved blueprints).
//   8. Add each edge as a graph dependency, skipping disabled endpoints.
//   9. Wire start nodes — no incoming edges and not passive — to START. Throws if there are none.
//  10. Fire the igniter (webhook payload / chat message) at the nodes that handle it.
//
// The returned context is what AggexEngine.run() consumes. Note the graph is a signal graph,
// not a DAG — nodes fire on accumulated signals and may re-fire, so cycles are legal here.
export class TurboGraph {
    constructor() { }



    public async compile(
        workflowId:          Workflow.Id,
        workflowData:        Workflow.Data,
        execution:           Execution,
        realtime:            RealtimeService,
        engine:              AggexEngine,
        airlock:             AirlockService,
        credentialInstances: Record<Vault.Credential.Instance.Id, Vault.Credential.Instance>,
        internalAPI:         HTTP.Client,
        compilationCtx:      TurboGraph.Compilation.Context = createCompilationContext(workflowId),
        enclosingNodeAPI?:   RuntimeNode.ExecutionContext["enclosingNodeAPI"],
    ): Promise<AggexEngine.Execution.Context> {

        const blueprints    = await this.loadAllBlueprints(workflowData);
        const workflowCache = Workflow.createCache(workflowData, blueprints);

        const graph = new S2Graph();
        const nodes = workflowData.nodes;
        const edges = workflowCache.edges;

        graph.addVertex(S2Graph.START_VERTEX_ID);

        // Registers the @workflow copy, deduped by id.
        airlock.registerWorkflow(workflowId, workflowData);

        const { nodeExecutionCtx, engineExecutionCtx } = createContexts({
            engine, airlock, execution, workflowId, workflowData, workflowCache,
            graph, credentialInstances, realtime, internalAPI, enclosingNodeAPI,
        });

        for (const wfNode of Object.values(nodes)) {
            if (wfNode.isDisabled)
                continue;

            await this.prepareNode(engine, engineExecutionCtx, nodeExecutionCtx, wfNode, compilationCtx);
        }

        // Must run after prepareNode — needs the resolved blueprints.
        this.warmExpressionCache(airlock, engineExecutionCtx);

        for (const edge of Object.values(edges)) {

            const sourceNode = nodes[edge.source.nodeId];
            const targetNode = nodes[edge.target.nodeId];

            if (sourceNode.isDisabled || targetNode.isDisabled)
                continue;

            graph.addDependency(
                edge.source.nodeId,
                edge.target.nodeId,
            );
        }


        const startNodes = this.findStartNodes(nodes, edges, (id) => engine.instanceRegistryAPI.get(id));

        if (startNodes.length === 0)
            throw new AggexCompilerError(
                SystemError.Code.COMPILATION_NO_START_NODES,
                "No start nodes found — the graph may be empty",
            )

        startNodes.forEach(nodeId => {
            graph.addDependency(S2Graph.START_VERTEX_ID, nodeId);
        });

        await this.handleIgniter(engine, execution.igniter);

        return engineExecutionCtx;
    }



    // Resolves every node's blueprint up front — createCache reads synchronously, so nothing can
    // stay behind an await by the time it runs. Keyed the way createCache indexes it.
    private async loadAllBlueprints(workflowData: Workflow.Data): Promise<Record<Blueprint.Id, Blueprint>> {

        const blueprints: Record<Blueprint.Id, Blueprint> = {};

        for (const wfNode of Object.values(workflowData.nodes)) {

            const staticValues = workflowData.staticValues[wfNode.id] ?? {};

            const { blueprint } = await CatalogueService.resolveWorkflowNode(wfNode, staticValues, workflowData);

            blueprints[wfNode.reconciledBlueprintId ?? wfNode.blueprintId] = blueprint;
        }

        return blueprints;
    }



    // Best-effort: evaluate compiles on demand anyway, so failures here are swallowed.
    private warmExpressionCache(airlock: AirlockService, ctx: AggexEngine.Execution.Context): void {

        for (const node of Object.values(ctx.workflowData.nodes)) {

            const blueprint    = ctx.catalogueAPI.getBlueprint(node.id);
            const staticValues = ctx.workflowData.staticValues[node.id] ?? {};
            const expressionOverrides = ctx.workflowData.fieldExpressions?.[node.id] ?? {};
            const values       = mapFieldValues(blueprint.fields, staticValues);

            for (const field of blueprint.fields) {

                if (Field.usesExpression(field, expressionOverrides[field.id]) === false)
                    continue;

                const raw = values[field.id];

                if (typeof raw !== "string")
                    continue;

                try {
                    airlock.compileExpression(
                        Airlock.Source.asExpression(raw),
                        Airlock.coerceTargetForVariant(field.variant),
                    );
                }
                catch {
                    // invalid expr → surfaced at runtime via onError
                }
            }
        }
    }



    private async handleIgniter(
        engine:  AggexEngine,
        igniter: Execution.Igniter,
    ){
        switch (igniter.variant) {

            case "webhook": {

                const instance = engine.instanceRegistryAPI.get(igniter.nodeId as Workflow.Node.Id);

                if (instance)
                    await instance.triggerWebhook(igniter.payload as Record<string, unknown>);

                break;
            }

            case "chat_message": {

                for (const instance of engine.instanceRegistryAPI.getAll())
                    await instance.handleIgniter(igniter);

                break;
            }
        }
    }



    // Fail loudly rather than egressing from the wrong country: a node that doesn't route
    // through httpClientFactory would silently ignore an attached proxy.
    private assertProxySupported(
        wfNode:             Workflow.Node.Raw,
        blueprint:          Blueprint,
        engineExecutionCtx: AggexEngine.Execution.Context,
    ): void {

        const attached = engineExecutionCtx.workflowData
            .credentialInstanceIds[wfNode.id]?.[NetworkProxy.TEMPLATE_ID];

        if (!attached || blueprint.proxyCompatible)
            return;

        throw new AggexCompilerError(
            SystemError.Code.COMPILATION_PROXY_UNSUPPORTED,
            `Node "${blueprint.ui.displayName}" has a proxy attached but does not support proxying — its traffic would bypass the proxy. Detach the proxy from this node.`,
            { data: { nodeId: wfNode.id, blueprintId: wfNode.blueprintId } },
        );
    }



    private async prepareNode(
        engine:             AggexEngine,
        engineExecutionCtx: AggexEngine.Execution.Context,
        nodeExecutionCtx:   RuntimeNode.ExecutionContext,
        wfNode:             Workflow.Node.Raw,
        compilationCtx:     TurboGraph.Compilation.Context,
    ): Promise<void> {

        const { compiledGraph: graph } = engineExecutionCtx;

        const workflowData = engineExecutionCtx.workflowData
        const staticValues = workflowData.staticValues[wfNode.id] ?? {};

        const { RuntimeNode, blueprint } = await CatalogueService.resolveWorkflowNode(wfNode, staticValues, workflowData);

        this.assertProxySupported(wfNode, blueprint, engineExecutionCtx);

        // Resolved blueprint, so this includes derivative-contributed fields.
        const fieldValues = mapFieldValues(blueprint.fields, staticValues);

        const instance = new RuntimeNode(wfNode.id, nodeExecutionCtx);

        await instance.compile(compilationCtx);

        graph.addVertex(wfNode.id);

        engine.registerNode(wfNode.id, wfNode, instance);

        // Defaults to "AND" when the node has no signalDependency field.
        if (Object.hasOwn(fieldValues, "signalDependency"))
            graph.setVertexStrategy(
                wfNode.id as unknown as Vertex.Id,
                fieldValues["signalDependency" as Field.Id] as Vertex.STRATEGY,
            );
    }



    private findStartNodes(
        nodes:       Workflow.Data["nodes"],
        edges:       Workflow.Cache["edges"],
        getInstance: (id: Workflow.Node.Id) => RuntimeNode<Blueprint> | undefined,
    ): Workflow.Node.Id[] {

        const targetNodeIds = new Set<Workflow.Node.Id>();

        Object.values(edges).forEach(edge => targetNodeIds.add(edge.target.nodeId));

        return Object.values(nodes).filter(node => {

            if (node.isDisabled)
                return false;

            if (targetNodeIds.has(node.id))
                return false;

            const instance = getInstance(node.id);

            if (instance?.IS_PASSIVE)
                return false;

            return true;

        }).map(node => node.id);
    }
}



export namespace TurboGraph {
    export namespace Compilation {
        export interface Context {
            compilePath: readonly Workflow.Id[];
            parentWorkflowIgniter?: Execution.Igniter;
        }
    }

}

export function createCompilationContext(rootId: Workflow.Id): TurboGraph.Compilation.Context {
    return { compilePath: [rootId] };
}

export function extendCompilePath(
    compilePath: TurboGraph.Compilation.Context["compilePath"],
    nextId: Workflow.Id,
): TurboGraph.Compilation.Context {
    return {
        compilePath: [...compilePath, nextId],
    };
}
