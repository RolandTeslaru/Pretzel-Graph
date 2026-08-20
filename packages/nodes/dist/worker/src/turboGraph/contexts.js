"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createContexts = createContexts;
const apis_1 = require("./apis");
// Builds the node + engine execution contexts for a compile pass, wiring the shared ctxRef the
// APIs close over. Returns both; the caller drives prepareNode with them.
function createContexts(params) {
    const { engine, airlock, execution, workflowId, workflowData, workflowCache, graph, credentialInstances, realtime, internalAPI, enclosingNodeAPI, } = params;
    const ctxRef = { current: null };
    const apis = (0, apis_1.createExecutionAPIs)(engine, airlock, ctxRef, execution, workflowId, workflowData, credentialInstances, realtime, internalAPI);
    const base = {
        executionId: execution.id,
        igniter: execution.igniter,
        workflowId,
        workflowData,
        workflowCache,
        enclosingNodeAPI,
        ...apis
    };
    const nodeExecutionCtx = {
        ...base,
        // Keep this getter on the final object. Object spread evaluates accessors, which
        // would otherwise freeze `session` to the initial value while updateSession replaces it.
        get session() { return execution.session; },
    };
    const engineExecutionCtx = {
        ...base,
        get session() { return execution.session; },
        compiledGraph: graph,
        activeNodes: new Set(),
        errorChannel: new Map(),
        stopAtNodeId: execution.igniter.variant === "workbench_step" ? execution.igniter.targetNodeId : undefined,
    };
    ctxRef.current = engineExecutionCtx;
    return { nodeExecutionCtx, engineExecutionCtx };
}
