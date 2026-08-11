import { Execution, Vault } from "@pretzel-graph/shared/domain";
import { Workflow } from "@pretzel-graph/shared/domain/Workflow";
import { HTTP, RuntimeNode } from "@pretzel-graph/node-sdk";
import { AggexEngine } from "src/engine";

import { AirlockService } from "../airlock";
import { S2Graph } from "../S2/graph";
import { createExecutionAPIs } from "./apis";

// Builds the node + engine execution contexts for a compile pass, wiring the shared ctxRef the
// APIs close over. Returns both; the caller drives prepareNode with them.
export function createContexts(params: {
    engine:              AggexEngine,
    airlock:             AirlockService,
    execution:           Execution,
    workflowId:          Workflow.Id,
    workflowData:        Workflow.Data,
    workflowCache:       Workflow.Cache,
    graph:               S2Graph,
    credentialInstances: Record<Vault.Credential.Instance.Id, Vault.Credential.Instance>,
    realtime:            RuntimeNode.RealtimeScope,
    internalAPI:         HTTP.Client,
    enclosingNodeAPI?:   RuntimeNode.ExecutionContext["enclosingNodeAPI"],
}): { nodeExecutionCtx: RuntimeNode.ExecutionContext; engineExecutionCtx: AggexEngine.Execution.Context } {
    const {
        engine, airlock, execution, workflowId, workflowData, workflowCache,
        graph, credentialInstances, realtime, internalAPI, enclosingNodeAPI,
    } = params;

    const ctxRef = { current: null! as AggexEngine.Execution.Context };
    const apis = createExecutionAPIs(engine, airlock, ctxRef, execution, workflowId, workflowData, credentialInstances, realtime, internalAPI);

    const base = {
        executionId: execution.id,
        igniter: execution.igniter,
        workflowId,
        workflowData,
        workflowCache,
        enclosingNodeAPI,
        ...apis
    }

    const nodeExecutionCtx = {
        ...base,
        // Keep this getter on the final object. Object spread evaluates accessors, which
        // would otherwise freeze `session` to the initial value while updateSession replaces it.
        get session() { return execution.session; },
    } satisfies RuntimeNode.ExecutionContext

    const engineExecutionCtx = {
        ...base,
        get session() { return execution.session; },
        compiledGraph: graph,
        activeNodes: new Set(),
        errorChannel: new Map(),
        stopAtNodeId: execution.igniter.variant === "workbench_step" ? execution.igniter.targetNodeId : undefined,
    } satisfies AggexEngine.Execution.Context

    ctxRef.current = engineExecutionCtx;

    return { nodeExecutionCtx, engineExecutionCtx };
}
