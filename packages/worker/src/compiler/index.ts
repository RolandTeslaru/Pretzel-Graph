/*
 * PretzelGraph — https://github.com/RolandTeslaru/Pretzel-Graph
 * PolyForm Noncommercial License 1.0.0. Commercial use requires a separate license.
 * PZG-src::9f3a1c
 */
import { Airlock, Execution, Foundations, Realtime, Vault } from "@pretzel-graph/shared/domain";
import { SystemError } from "@pretzel-graph/shared/domain/SystemError";
import { Workflow } from "@pretzel-graph/shared/domain/Workflow";
import { CatalogueService, RuntimeNode, mapFieldValues, type NodeConstructor } from "@pretzel-graph/node-sdk";
import { Blueprint } from "@pretzel-graph/shared/domain/Foundations/Blueprint";

import { AggexCompilerError } from "../errors";
import { AirlockService } from "../airlock";
import { S2Graph, Vertex } from "../S2/graph";
import { isUUID } from "../utils";

import { AggexEngine } from "src/engine";
import { Field } from "@pretzel-graph/shared/domain/Foundations/Field";
import { RealtimeService } from "../realtime";
import { createContexts } from "./contexts";


export class WorkflowCompiler {
    constructor() { }

    public async compile(
        workflowId:          Workflow.Id,
        workflowData:        Workflow.Data,
        execution:           Execution,
        realtime:            RealtimeService,
        engine:              AggexEngine,
        airlock:             AirlockService,
        credentialInstances: Record<Vault.Credential.Instance.Id, Vault.Credential.Instance>,
        compilationCtx:    WorkflowCompiler.Compilation.Context = createCompilationContext(workflowId),
        enclosingNodeAPI?: RuntimeNode.ExecutionContext["enclosingNodeAPI"],
    ): Promise<AggexEngine.Execution.Context> {
        const workflowCache = Workflow.createCache(workflowData);

        const graph = new S2Graph();
        const nodes = workflowData.nodes;
        const edges = workflowData.edges;

        // START vertex — S2Engine ignites from here
        graph.addVertex(S2Graph.START_VERTEX_ID);

        // AIRLOCK — register this workflow's @workflow copy (dedup by id) and create this env's
        // sandbox scope (one Context, reused across re-fires). Expression cache is warmed after
        // nodes are prepared (it needs their resolved blueprints).
        airlock.registerWorkflow(workflowId, workflowData);
        const airlockScope = airlock.createScope(workflowId, {
            igniter: execution.igniter,
            chatId:  execution.chat_id,
        });

        const { nodeExecutionCtx, engineExecutionCtx } = createContexts({
            engine, airlock, execution, workflowId, workflowData, workflowCache,
            airlockScope, graph, credentialInstances, realtime, enclosingNodeAPI,
        });

        // Add nodes to the graph (populates engineExecutionCtx.blueprints)
        for (const wfNode of Object.values(nodes))
            await this.prepareNode(engine, engineExecutionCtx, nodeExecutionCtx, wfNode, compilationCtx);

        // Warm the expression cache now that every node's resolved blueprint is available.
        this.warmExpressionCache(airlock, engineExecutionCtx);

        // Add Edges. Might also get ran multiple times because nodes can have multiple edges between them because of ports.
        for (const edge of Object.values(edges)) {
            const sourceNode = nodes[edge.source.nodeId];
            const targetNode = nodes[edge.target.nodeId];

            if(sourceNode.isDisabled || targetNode.isDisabled)
                continue;

            graph.addDependency(
                edge.source.nodeId,
                edge.target.nodeId
            );
        }

        // Set Entry Points (Start Nodes)
        const startNodes = this.findStartNodes(nodes, edges, (id) => engine.instanceRegistryAPI.get(id));
        if (startNodes.length === 0)
            throw new AggexCompilerError(
                SystemError.Code.COMPILATION_NO_START_NODES,
                "No start nodes found — the graph may be empty"
            )

        startNodes.forEach(nodeId => {
            graph.addDependency(S2Graph.START_VERTEX_ID, nodeId);
        });

        await this.handleIgniter(engine, execution.igniter);

        return engineExecutionCtx;
    }




    /**
     * Eager (best-effort) compilation of every `isExpression` field, to warm the script
     * cache so the first firing doesn't pay the compile cost. Not a correctness dependency:
     * `airlockScope.evaluate` compiles-on-demand anyway, and a syntactically-invalid
     * expression is left to surface at runtime via the node's `onError` (so we swallow
     * compile errors here rather than abort the whole workflow compile).
     */
    private warmExpressionCache(airlock: AirlockService, ctx: AggexEngine.Execution.Context): void {
        for (const node of Object.values(ctx.workflowData.nodes)) {
            const blueprint = ctx.catalogueAPI.getBlueprint(node.id);
            const staticValues = ctx.workflowData.staticValues[node.id] ?? {};
            const values = mapFieldValues(blueprint.fields, staticValues);

            for (const field of blueprint.fields) {
                if(Field.isExpression(field) === false)
                    continue

                const raw = values[field.id];
                
                if (typeof raw !== "string") 
                    continue;

                try {
                    airlock.compileExpression(
                        Airlock.Source.asExpression(raw),
                        Airlock.coerceTargetForVariant(field.variant),
                    );
                } catch { /* invalid expr → surfaced at runtime via onError */ }
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




    // Resolve a node absent from the catalogue as a subworkflow dependency, falling back to the
    // Core.SubWorkflow.Execute node. Throws if it isn't a dependency or the dependency is missing.
    private async resolveDependencyNode(
        wfNode:             Workflow.Node,
        engineExecutionCtx: AggexEngine.Execution.Context,
    ): Promise<{ RuntimeNode: NodeConstructor; blueprint: Foundations.Blueprint | null }> {
        if (!wfNode.dependency)
            throw new AggexCompilerError(
                SystemError.Code.COMPILATION_NODE_NOT_FOUND,
                `Could not find node with blueprintId "${wfNode.blueprintId}" in the catalogue`,
                { data: { nodeId: wfNode.id, blueprintId: wfNode.blueprintId } }
            );

        const { dependencies } = engineExecutionCtx.workflowData;
        const { workflowId, mode } = wfNode.dependency;
        const hasDep = mode === "publication"
            ? !!dependencies?.published?.[workflowId]
            : !!dependencies?.draft?.[workflowId];
        if (!hasDep)
            throw new AggexCompilerError(
                SystemError.Code.COMPILATION_MISSING_SUBWORKFLOW_DEPENDENCY,
                `Missing dependency "${workflowId}" for node "${wfNode.id}"`,
                { data: { nodeId: wfNode.id, blueprintId: wfNode.blueprintId, missingDependencyId: workflowId } }
            );

        const executeId = "Core.SubWorkflow.Execute" as Foundations.Blueprint.Id;
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

    // Resolve a node's definitive class + blueprint: load base, reconcile if needed, fall back to a
    // subworkflow dependency, and register the resolved blueprint under its read-site key so
    // ctx.catalogueAPI.getBlueprint can find it during instantiation. Throws if unresolvable.
    private async resolveNode(
        wfNode:             Workflow.Node,
        engineExecutionCtx: AggexEngine.Execution.Context,
    ): Promise<{ RuntimeNode: NodeConstructor; blueprint: Foundations.Blueprint }> {
        const staticValues = engineExecutionCtx.workflowData.staticValues[wfNode.id] ?? {};

        let RuntimeNode = await CatalogueService.getNode(wfNode.blueprintId);
        const base = await CatalogueService.loadBlueprint(wfNode.blueprintId);

        // Reconcile off the base field values — the reconcile discriminator always lives on base,
        // so mapping over base (not the resolved blueprint) avoids the chicken-and-egg.
        let blueprint = wfNode.reconciledBlueprintId && base
            ? await CatalogueService.reconcile(wfNode.blueprintId, mapFieldValues(base.fields, staticValues))
            : base;

        // Not in the catalogue — resolve it as a subworkflow dependency (or throw).
        if (!RuntimeNode && !blueprint)
            ({ RuntimeNode, blueprint } = await this.resolveDependencyNode(wfNode, engineExecutionCtx));

        if (!RuntimeNode || !blueprint)
            throw new AggexCompilerError(SystemError.Code.COMPILATION_NODE_NOT_FOUND, `Could not resolve node "${wfNode.id}" (${wfNode.blueprintId})`, { data: { nodeId: wfNode.id, blueprintId: wfNode.blueprintId } });

        // Register the resolved blueprint before instantiation — read sites resolve it via
        // ctx.catalogueAPI.getBlueprint, keyed by reconciledBlueprintId ?? blueprintId. loadBlueprint/
        // reconcile already auto-cache base + reconciled under those keys, so this is mainly for
        // dependency nodes: their blueprint is Core.SubWorkflow.Execute's (cached under that id), which
        // wouldn't otherwise be reachable under the dependency's own blueprintId that read sites use.
        CatalogueService.registerBlueprint(wfNode.reconciledBlueprintId ?? wfNode.blueprintId, blueprint);

        return { RuntimeNode, blueprint };
    }

    private async prepareNode(
        engine:             AggexEngine,
        engineExecutionCtx: AggexEngine.Execution.Context,
        nodeExecutionCtx:   RuntimeNode.ExecutionContext,
        wfNode:             Workflow.Node,
        compilationCtx:     WorkflowCompiler.Compilation.Context,
    ): Promise<void> {

        const { compiledGraph: graph } = engineExecutionCtx;
        const staticValues = engineExecutionCtx.workflowData.staticValues[wfNode.id] ?? {};

        const { RuntimeNode, blueprint } = await this.resolveNode(wfNode, engineExecutionCtx);

        // Final field values off the resolved blueprint (includes reconcile-added fields).
        const fieldValues = mapFieldValues(blueprint.fields, staticValues);

        const instance = new RuntimeNode(wfNode, nodeExecutionCtx);
        await instance.compile(compilationCtx)

        graph.addVertex(wfNode.id);

        engine.registerNode(wfNode.id, wfNode, instance);

        // Set vertex execution strategy based on node fields. Default is "AND"
        if (Object.hasOwn(fieldValues, "signalDependency"))
            graph.setVertexStrategy(
                wfNode.id as unknown as Vertex.Id,
                fieldValues["signalDependency" as Foundations.Field.Id] as Vertex.STRATEGY
            );
    }
    



    private findStartNodes(
        nodes:       Workflow.Data["nodes"],
        edges:       Workflow.Data["edges"],
        getInstance: (id: Workflow.Node.Id) => RuntimeNode<Blueprint> | undefined,
    ): Workflow.Node.Id[] {
        const targetNodeIds = new Set<Workflow.Node.Id>();
        Object.values(edges).forEach(edge => targetNodeIds.add(edge.target.nodeId));

        return Object.keys(nodes).filter(id => {
            if (targetNodeIds.has(id as Workflow.Node.Id))
                return false;
            const instance = getInstance(id as Workflow.Node.Id);
            if (instance?.IS_PASSIVE)
                return false;
            return true;
        }) as Workflow.Node.Id[];
    }
}



export namespace WorkflowCompiler {
    export namespace Compilation {
        export interface Context {
            compilePath: readonly Workflow.Id[];
            parentWorkflowIgniter?: Execution.Igniter;
        }
    }

}

export function createCompilationContext(rootId: Workflow.Id): WorkflowCompiler.Compilation.Context {
    return { compilePath: [rootId] };
}

export function extendCompilePath(
    compilePath: WorkflowCompiler.Compilation.Context["compilePath"],
    nextId: Workflow.Id,
): WorkflowCompiler.Compilation.Context {
    return {
        compilePath: [...compilePath, nextId],
    };
}
