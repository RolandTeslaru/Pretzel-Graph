import { Execution, Vault } from "@pretzel-graph/shared/domain";
import { Workflow } from "@pretzel-graph/shared/domain/Workflow";
import { RuntimeNode } from "@pretzel-graph/node-sdk";
import { AggexEngine } from "src/engine";

import { AirlockService } from "../airlock";
import { RealtimeService } from "../realtime";
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
    airlockScope:        RuntimeNode.ExecutionContext["airlockAPI"],
    graph:               S2Graph,
    credentialInstances: Record<Vault.Credential.Instance.Id, Vault.Credential.Instance>,
    realtime:            RealtimeService,
    enclosingNodeAPI?:   RuntimeNode.ExecutionContext["enclosingNodeAPI"],
}): { nodeExecutionCtx: RuntimeNode.ExecutionContext; engineExecutionCtx: AggexEngine.Execution.Context } {
    const {
        engine, airlock, execution, workflowId, workflowData, workflowCache,
        airlockScope, graph, credentialInstances, realtime, enclosingNodeAPI,
    } = params;

    const ctxRef = { current: null! as AggexEngine.Execution.Context };
    const apis = createExecutionAPIs(engine, airlock, ctxRef, execution, workflowData, credentialInstances, realtime);

    const nodeExecutionCtx = {
        executionId: execution.id,
        workflowId,
        chat_id: execution.chat_id,
        workflowData,
        workflowCache,
        airlockAPI: airlockScope,
        get session() { return execution.session; },
        enclosingNodeAPI,
        ...apis,
    } satisfies RuntimeNode.ExecutionContext

    const engineExecutionCtx = {
        executionId: execution.id,
        workflowId,
        chat_id: execution.chat_id,
        workflowData,
        workflowCache,
        airlockAPI: airlockScope,
        get session() { return execution.session; },
        compiledGraph: graph,
        activeNodes: new Set(),
        errorChannel: new Map(),
        // "Execute up until this point": abort once this node completes (full graph runs normally).
        stopAtNodeId: execution.igniter.variant === "workbench_step" ? execution.igniter.targetNodeId : undefined,
        enclosingNodeAPI,
        ...apis,
    } satisfies AggexEngine.Execution.Context

    ctxRef.current = engineExecutionCtx;

    return { nodeExecutionCtx, engineExecutionCtx };
}
