"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TurboGraph = void 0;
exports.createCompilationContext = createCompilationContext;
exports.extendCompilePath = extendCompilePath;
/*
 * PretzelGraph — https://github.com/RolandTeslaru/Pretzel-Graph
 * PolyForm Noncommercial License 1.0.0. Commercial use requires a separate license.
 * PZG-src::9f3a1c
 */
const domain_1 = require("../../../shared/domain");
const SystemError_1 = require("../../../shared/domain/SystemError");
const Workflow_1 = require("../../../shared/domain/Workflow");
const node_sdk_1 = require("../../../node-sdk/src/index.js");
const errors_1 = require("../errors");
const graph_1 = require("../S2/graph");
const Field_1 = require("../../../shared/domain/Foundations/Field");
const contexts_1 = require("./contexts");
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
class TurboGraph {
    constructor() { }
    async compile(workflowId, workflowData, execution, realtime, engine, airlock, credentialInstances, internalAPI, compilationCtx = createCompilationContext(workflowId), enclosingNodeAPI) {
        const blueprints = await this.loadAllBlueprints(workflowData);
        const workflowCache = Workflow_1.Workflow.createCache(workflowData, blueprints);
        const graph = new graph_1.S2Graph();
        const nodes = workflowData.nodes;
        const edges = workflowCache.edges;
        graph.addVertex(graph_1.S2Graph.START_VERTEX_ID);
        // Registers the @workflow copy, deduped by id.
        airlock.registerWorkflow(workflowId, workflowData);
        const { nodeExecutionCtx, engineExecutionCtx } = (0, contexts_1.createContexts)({
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
            graph.addDependency(edge.source.nodeId, edge.target.nodeId);
        }
        const electedNodeId = "nodeId" in execution.igniter ? execution.igniter.nodeId : undefined;
        if (electedNodeId !== undefined)
            this.assertIgniteable(electedNodeId, engineExecutionCtx);
        const startNodes = this.findStartNodes(nodes, edges, (id) => engineExecutionCtx.catalogueAPI.getBlueprint(id), electedNodeId);
        if (startNodes.length === 0)
            throw new errors_1.AggexCompilerError(SystemError_1.SystemError.Code.COMPILATION_NO_START_NODES, "No start nodes found — the graph may be empty");
        startNodes.forEach(nodeId => {
            graph.addDependency(graph_1.S2Graph.START_VERTEX_ID, nodeId);
        });
        await this.handleIgniter(engine, execution.igniter);
        return engineExecutionCtx;
    }
    // Resolves every node's blueprint up front — createCache reads synchronously, so nothing can
    // stay behind an await by the time it runs. Keyed the way createCache indexes it.
    async loadAllBlueprints(workflowData) {
        const blueprints = {};
        for (const wfNode of Object.values(workflowData.nodes)) {
            const staticValues = workflowData.staticValues[wfNode.id] ?? {};
            const { blueprint } = await node_sdk_1.CatalogueService.resolveWorkflowNode(wfNode, staticValues, workflowData);
            blueprints[wfNode.reconciledBlueprintId ?? wfNode.blueprintId] = blueprint;
        }
        return blueprints;
    }
    // Best-effort: evaluate compiles on demand anyway, so failures here are swallowed.
    warmExpressionCache(airlock, ctx) {
        for (const node of Object.values(ctx.workflowData.nodes)) {
            const blueprint = ctx.catalogueAPI.getBlueprint(node.id);
            const staticValues = ctx.workflowData.staticValues[node.id] ?? {};
            const expressionOverrides = ctx.workflowData.fieldExpressions?.[node.id] ?? {};
            const values = (0, node_sdk_1.mapFieldValues)(blueprint.fields, staticValues);
            for (const field of blueprint.fields) {
                if (Field_1.Field.usesExpression(field, expressionOverrides[field.id]) === false)
                    continue;
                const raw = values[field.id];
                if (typeof raw !== "string")
                    continue;
                try {
                    airlock.compileExpression(domain_1.Airlock.Source.asExpression(raw), domain_1.Airlock.coerceTargetForVariant(field.variant));
                }
                catch {
                    // invalid expr → surfaced at runtime via onError
                }
            }
        }
    }
    async handleIgniter(engine, igniter) {
        switch (igniter.variant) {
            case "webhook": {
                const instance = engine.instanceRegistryAPI.get(igniter.nodeId);
                if (instance)
                    await instance.triggerWebhook(igniter.payload);
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
    assertProxySupported(wfNode, blueprint, engineExecutionCtx) {
        const attached = engineExecutionCtx.workflowData
            .credentialInstanceIds[wfNode.id]?.[node_sdk_1.NetworkProxy.TEMPLATE_ID];
        if (!attached || blueprint.proxyCompatible)
            return;
        throw new errors_1.AggexCompilerError(SystemError_1.SystemError.Code.COMPILATION_PROXY_UNSUPPORTED, `Node "${blueprint.ui.displayName}" has a proxy attached but does not support proxying — its traffic would bypass the proxy. Detach the proxy from this node.`, { data: { nodeId: wfNode.id, blueprintId: wfNode.blueprintId } });
    }
    async prepareNode(engine, engineExecutionCtx, nodeExecutionCtx, wfNode, compilationCtx) {
        const { compiledGraph: graph } = engineExecutionCtx;
        const workflowData = engineExecutionCtx.workflowData;
        const staticValues = workflowData.staticValues[wfNode.id] ?? {};
        const { RuntimeNode, blueprint } = await node_sdk_1.CatalogueService.resolveWorkflowNode(wfNode, staticValues, workflowData);
        this.assertProxySupported(wfNode, blueprint, engineExecutionCtx);
        // Resolved blueprint, so this includes derivative-contributed fields.
        const fieldValues = (0, node_sdk_1.mapFieldValues)(blueprint.fields, staticValues);
        const instance = new RuntimeNode(wfNode.id, nodeExecutionCtx);
        await instance.compile(compilationCtx);
        graph.addVertex(wfNode.id);
        engine.registerNode(wfNode.id, wfNode, instance);
        // Defaults to "AND" when the node has no signalDependency field.
        if (Object.hasOwn(fieldValues, "signalDependency"))
            graph.setVertexStrategy(wfNode.id, fieldValues["signalDependency"]);
    }
    // Only igniteable nodes can be elected — otherwise the igniter could promote a
    // node that has no way to start anything, and it would run against nothing.
    assertIgniteable(nodeId, ctx) {
        const blueprint = ctx.catalogueAPI.getBlueprint(nodeId);
        if (blueprint?.igniter)
            return;
        throw new errors_1.AggexCompilerError(SystemError_1.SystemError.Code.COMPILATION_NOT_IGNITEABLE, `Node "${blueprint?.ui.displayName ?? nodeId}" is not an igniter and cannot start a run.`, { data: { nodeId } });
    }
    // Igniters never self-start, so a graph of nothing but igniters has no
    // conventional start node. The run elects exactly one, and that one is promoted
    // here. Passive nodes are excluded outright — they are never electable, and only
    // ever fire when another node triggers them mid-run.
    findStartNodes(nodes, edges, getBlueprint, electedNodeId) {
        const targetNodeIds = new Set();
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
exports.TurboGraph = TurboGraph;
function createCompilationContext(rootId) {
    return { compilePath: [rootId] };
}
function extendCompilePath(compilePath, nextId) {
    return {
        compilePath: [...compilePath, nextId],
    };
}
