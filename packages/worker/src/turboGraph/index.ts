/*
 * PretzelGraph — https://github.com/RolandTeslaru/Pretzel-Graph
 * Elastic License 2.0. See LICENSE.
 */
import { Airlock, Execution, Workbench } from "@pretzel-graph/shared/domain";
import { SystemError } from "@pretzel-graph/shared/domain/SystemError";
import { Workflow } from "@pretzel-graph/shared/domain/Workflow";
import { CatalogueService, NetworkProxy, RuntimeNode, mapFieldValues } from "@pretzel-graph/node-sdk";
import { Blueprint } from "@pretzel-graph/shared/domain/Foundations/Blueprint";

import { AggexCompilerError } from "../errors";
import { S2Graph, Vertex } from "../S2/graph";
import { isUUID } from "../utils";

import { Field } from "@pretzel-graph/shared/domain/Foundations/Field";
import type { ExecutionContext } from "../execution-context";


// Turns stored Workflow.Data into a runnable execution context. compile() in order:
//
//   1. Resolve every node's blueprint via CatalogueService — load, derive, or fall back to a
//      subworkflow dependency — into a map keyed the way createCache indexes it.
//   2. Build the Workflow.Cache (resolved port/field shapes, fat edges) off those blueprints.
//   3. Populate the execution context's S2Graph and add its START vertex.
//   4. Register the workflow with the airlock sandbox.
//   5. prepareNode per enabled node: instantiate its RuntimeNode class, register it with the
//      engine, add its vertex, and set the AND/OR signal strategy.
//   6. Warm the expression cache (needs step 5's resolved blueprints).
//   7. Add each edge as a graph dependency, skipping disabled endpoints.
//   8. Wire start nodes — no incoming edges and not passive — to START. Throws if there are none.
//   9. Fire the igniter (webhook payload / chat message) at the nodes that handle it.
//
// The graph is a signal graph, not a DAG — nodes fire on accumulated signals and may re-fire,
// so cycles are legal here.
export class TurboGraph {
    constructor() { }



    public async compile(
        executionCtx:        ExecutionContext,
        compilationCtx:      TurboGraph.Compilation.Context = createCompilationContext(executionCtx.workflowId),
    ): Promise<void> {

        const { workflowId, workflowData, compiledGraph: graph } = executionCtx;

        await CatalogueService.warmBlueprintCache(workflowData);

        const blueprints    = await this.loadAllBlueprints(workflowData);
        executionCtx.workflowCache = Workbench.Document.createCache(workflowData, blueprints);

        const nodes = workflowData.nodes;
        const edges = executionCtx.workflowCache.edges;

        graph.addVertex(S2Graph.START_VERTEX_ID);

        for (const wfNode of Object.values(nodes)) {
            if (wfNode.isDisabled)
                continue;

            await this.prepareNode(executionCtx, wfNode, compilationCtx);
        }

        // Must run after prepareNode — needs the resolved blueprints.
        this.warmExpressionCache(executionCtx);

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


        const electedNodeId = "nodeId" in executionCtx.igniter ? executionCtx.igniter.nodeId : undefined;

        if (electedNodeId !== undefined)
            this.assertIgniteable(electedNodeId, executionCtx);

        const startNodes = this.findStartNodes(
            nodes,
            edges,
            (id) => executionCtx.catalogueAPI.getBlueprint(id),
            electedNodeId,
        );

        if (startNodes.length === 0)
            throw new AggexCompilerError(
                SystemError.Code.COMPILATION_NO_START_NODES,
                "No start nodes found — the graph may be empty",
            )

        startNodes.forEach(nodeId => {
            graph.addDependency(S2Graph.START_VERTEX_ID, nodeId);
        });

        await this.handleIgniter(executionCtx);
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
    private warmExpressionCache(ctx: ExecutionContext): void {

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
                    ctx.airlock.compileExpression(
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
        executionCtx: ExecutionContext,
    ){
        const igniter = executionCtx.igniter;

        switch (igniter.variant) {

            case "webhook": {

                const instance = executionCtx.instanceRegistryAPI.get(igniter.nodeId as Workflow.Node.Id);

                if (instance)
                    await instance.triggerWebhook(igniter.payload as Record<string, unknown>);

                break;
            }

            case "chat_message": {

                for (const instance of executionCtx.instanceRegistryAPI.getAll())
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
        executionCtx:       ExecutionContext,
    ): void {

        const attached = executionCtx.workflowData
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
        executionCtx:       ExecutionContext,
        wfNode:             Workflow.Node.Raw,
        compilationCtx:     TurboGraph.Compilation.Context,
    ): Promise<void> {

        const { compiledGraph: graph } = executionCtx;

        const workflowData = executionCtx.workflowData
        const staticValues = workflowData.staticValues[wfNode.id] ?? {};

        const { RuntimeNode, blueprint } = await CatalogueService.resolveWorkflowNode(wfNode, staticValues, workflowData);

        this.assertProxySupported(wfNode, blueprint, executionCtx);

        // Resolved blueprint, so this includes derivative-contributed fields.
        const fieldValues = mapFieldValues(blueprint.fields, staticValues);

        const instance = new RuntimeNode(wfNode.id, executionCtx);

        await instance.compile(compilationCtx);

        graph.addVertex(wfNode.id);

        executionCtx.nodeRuntimeMap.set(wfNode.id, { wfNode, instance });

        // Defaults to "AND" when the node has no signalDependency field.
        if (Object.hasOwn(fieldValues, "signalDependency"))
            graph.setVertexStrategy(
                wfNode.id as unknown as Vertex.Id,
                fieldValues["signalDependency" as Field.Id] as Vertex.STRATEGY,
            );
    }



    // Only igniteable nodes can be elected — otherwise the igniter could promote a
    // node that has no way to start anything, and it would run against nothing.
    private assertIgniteable(
        nodeId: Workflow.Node.Id,
        ctx:    ExecutionContext,
    ): void {

        const blueprint = ctx.catalogueAPI.getBlueprint(nodeId);

        if (blueprint?.igniter)
            return;

        throw new AggexCompilerError(
            SystemError.Code.COMPILATION_NOT_IGNITEABLE,
            `Node "${blueprint?.ui.displayName ?? nodeId}" is not an igniter and cannot start a run.`,
            { data: { nodeId } },
        );
    }



    // Igniters never self-start, so a graph of nothing but igniters has no
    // conventional start node. The run elects exactly one, and that one is promoted
    // here. Passive nodes are excluded outright — they are never electable, and only
    // ever fire when another node triggers them mid-run.
    private findStartNodes(
        nodes:          Workflow.Data["nodes"],
        edges:          Workflow.Cache["edges"],
        getBlueprint:   (id: Workflow.Node.Id) => Blueprint | undefined,
        electedNodeId?: Workflow.Node.Id,
    ): Workflow.Node.Id[] {

        const targetNodeIds = new Set<Workflow.Node.Id>();

        Object.values(edges).forEach(edge => targetNodeIds.add(edge.target.nodeId));

        return Object.values(nodes).filter(node => {

            if (node.isDisabled)
                return false;

            if (targetNodeIds.has(node.id))
                return false;

            const blueprint = getBlueprint(node.id);

            if (blueprint?.passive)
                return false;

            if (blueprint?.igniter && node.id !== electedNodeId)
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
