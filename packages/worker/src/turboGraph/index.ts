/*
 * PretzelGraph — https://github.com/RolandTeslaru/Pretzel-Graph
 * PolyForm Noncommercial License 1.0.0. Commercial use requires a separate license.
 * PZG-src::9f3a1c
 */
import { Airlock, Execution, Foundations, Realtime, Vault } from "@pretzel-graph/shared/domain";
import { SystemError } from "@pretzel-graph/shared/domain/SystemError";
import { Workflow } from "@pretzel-graph/shared/domain/Workflow";
import { CatalogueService, NetworkProxy, RuntimeNode, mapFieldValues, type NodeConstructor } from "@pretzel-graph/node-sdk";
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
//   1. Resolve every node's blueprint — load, derive, or fall back to a subworkflow
//      dependency — which warms CatalogueService for the sync reads later steps rely on.
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
        compilationCtx:      TurboGraph.Compilation.Context = createCompilationContext(workflowId),
        enclosingNodeAPI?:   RuntimeNode.ExecutionContext["enclosingNodeAPI"],
    ): Promise<AggexEngine.Execution.Context> {

        const blueprints    = await this.createBlueprintFetcher(workflowData);
        const workflowCache = Workflow.createCache(workflowData, blueprints);

        const graph = new S2Graph();
        const nodes = workflowData.nodes;
        const edges = workflowCache.edges;

        graph.addVertex(S2Graph.START_VERTEX_ID);

        // Registers the @workflow copy, deduped by id.
        airlock.registerWorkflow(workflowId, workflowData);

        const { nodeExecutionCtx, engineExecutionCtx } = createContexts({
            engine, airlock, execution, workflowId, workflowData, workflowCache,
            graph, credentialInstances, realtime, enclosingNodeAPI,
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



    private async createBlueprintFetcher(workflowData: Workflow.Data): Promise<Record<Blueprint.Id, Blueprint>> {

        for (const wfNode of Object.values(workflowData.nodes))
            await this.resolveBlueprint(wfNode, workflowData);


        // createCache only needs sync indexed reads; the compiler warms CatalogueService first.
        return new Proxy({} as Record<Blueprint.Id, Blueprint>, {

            get: (_target, blueprintId: string | symbol) => {

                if (typeof blueprintId !== "string")
                    return undefined;

                return CatalogueService.getBlueprint(blueprintId as Blueprint.Id);
            },
        });
    }



    // Best-effort: evaluate compiles on demand anyway, so failures here are swallowed.
    private warmExpressionCache(airlock: AirlockService, ctx: AggexEngine.Execution.Context): void {

        for (const node of Object.values(ctx.workflowData.nodes)) {

            const blueprint    = ctx.catalogueAPI.getBlueprint(node.id);
            const staticValues = ctx.workflowData.staticValues[node.id] ?? {};
            const values       = mapFieldValues(blueprint.fields, staticValues);

            for (const field of blueprint.fields) {

                if (Field.isExpression(field) === false)
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



    private getDependencyStore(
        workflowData: Workflow.Data,
        wfNode: Workflow.Node.Raw,
    ) {
        if (!wfNode.dependencyRef)
            return null;

        const { workflowId, mode } = wfNode.dependencyRef;

        const store = mode === "publication"
            ? workflowData.dependencies?.published
            : workflowData.dependencies?.draft;

        return {
            workflowId,
            dependency: store?.[workflowId] ?? null,
        };
    }



    private async resolveDependencyNode(
        wfNode: Workflow.Node.Raw,
        workflowData: Workflow.Data,
    ): Promise<{ RuntimeNode: NodeConstructor; blueprint: Foundations.Blueprint | null }> {

        if (!wfNode.dependencyRef)
            throw new AggexCompilerError(
                SystemError.Code.COMPILATION_NODE_NOT_FOUND,
                `Could not find node with blueprintId "${wfNode.blueprintId}" in the catalogue`,
                { data: { nodeId: wfNode.id, blueprintId: wfNode.blueprintId } }
            );

        const dependencyRef = this.getDependencyStore(workflowData, wfNode);
        const hasDep        = !!dependencyRef?.dependency;

        if (!hasDep || !dependencyRef)
            throw new AggexCompilerError(
                SystemError.Code.COMPILATION_MISSING_SUBWORKFLOW_DEPENDENCY,
                `Missing dependency "${dependencyRef?.workflowId ?? "unknown"}" for node "${wfNode.id}"`,
                { data: { nodeId: wfNode.id, blueprintId: wfNode.blueprintId, missingDependencyId: dependencyRef?.workflowId } }
            );

        const executeId   = "Core.SubWorkflow.Execute" as Foundations.Blueprint.Id;
        const RuntimeNode = await CatalogueService.getNode(executeId);

        if (!RuntimeNode)
            throw new AggexCompilerError(
                SystemError.Code.COMPILATION_NODE_NOT_FOUND,
                `Core.SubWorkflow.Execute node not found in the catalogue`,
                { data: { nodeId: wfNode.id, blueprintId: wfNode.blueprintId } }
            );

        const blueprint = await CatalogueService.loadBlueprint(executeId);

        return { RuntimeNode, blueprint };
    }



    private async resolveBlueprint(
        wfNode: Workflow.Node.Raw,
        workflowData: Workflow.Data,
    ): Promise<Foundations.Blueprint> {

        const staticValues = workflowData.staticValues[wfNode.id] ?? {};
        const base         = await CatalogueService.loadBlueprint(wfNode.blueprintId);

        let blueprint = base
            ? await this.deriveNodeBlueprint(wfNode, base, staticValues)
            : base;

        if (!blueprint)
            blueprint = (await this.resolveDependencyNode(wfNode, workflowData)).blueprint;

        if (!blueprint)
            throw new AggexCompilerError(
                SystemError.Code.COMPILATION_NODE_NOT_FOUND,
                `Could not resolve node "${wfNode.id}" (${wfNode.blueprintId})`,
                { data: { nodeId: wfNode.id, blueprintId: wfNode.blueprintId } },
            );

        CatalogueService.registerBlueprint(wfNode.reconciledBlueprintId ?? wfNode.blueprintId, blueprint);

        return blueprint;
    }



    // Replay the derivative path the editor already settled on rather than re-deriving it from
    // base field values. A nested discriminant belongs to the branch that introduces it, so the
    // persisted path is the authoritative identity for an existing node.
    private async deriveNodeBlueprint(
        wfNode:       Workflow.Node.Raw,
        base:         Foundations.Blueprint,
        staticValues: Record<Foundations.Field.Id, Foundations.Field.Value>,
    ): Promise<Foundations.Blueprint | null> {

        if (!base._derivatives?.length)
            return base;

        const path = wfNode.reconciledBlueprintId && Blueprint.isReconciledId(wfNode.reconciledBlueprintId)
            ? wfNode.reconciledBlueprintId.slice(base.id.length + 1)
            : null;

        return path
            ? Blueprint.deriveByPath(base, path)
            : Blueprint.derive(base, staticValues).blueprint;
    }



    private async resolveNode(
        wfNode:             Workflow.Node.Raw,
        engineExecutionCtx: AggexEngine.Execution.Context,
    ): Promise<{ RuntimeNode: NodeConstructor; blueprint: Foundations.Blueprint }> {

        let RuntimeNode = await CatalogueService.getNode(wfNode.blueprintId);
        let blueprint: Foundations.Blueprint | null = await this.resolveBlueprint(wfNode, engineExecutionCtx.workflowData);

        // Gate on the class, not the blueprint: a dependency node has no class of its own, but its
        // blueprint is cached under the cosmetic id, so on later compiles only getNode stays null.
        if (!RuntimeNode)
            ({ RuntimeNode, blueprint } = await this.resolveDependencyNode(wfNode, engineExecutionCtx.workflowData));

        if (!RuntimeNode || !blueprint)
            throw new AggexCompilerError(
                SystemError.Code.COMPILATION_NODE_NOT_FOUND,
                `Could not resolve node "${wfNode.id}" (${wfNode.blueprintId})`,
                { data: { nodeId: wfNode.id, blueprintId: wfNode.blueprintId } },
            );

        return { RuntimeNode, blueprint };
    }



    // Fail loudly rather than egressing from the wrong country: a node that doesn't route
    // through httpClientFactory would silently ignore an attached proxy.
    private assertProxySupported(
        wfNode:             Workflow.Node.Raw,
        blueprint:          Foundations.Blueprint,
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

        const staticValues = engineExecutionCtx.workflowData.staticValues[wfNode.id] ?? {};

        const { RuntimeNode, blueprint } = await this.resolveNode(wfNode, engineExecutionCtx);

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
                fieldValues["signalDependency" as Foundations.Field.Id] as Vertex.STRATEGY,
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
