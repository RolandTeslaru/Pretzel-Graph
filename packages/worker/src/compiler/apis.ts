import { produce } from "immer";
import { Execution, Foundations, Realtime, Vault } from "@pretzel-graph/shared/domain";
import { Workflow } from "@pretzel-graph/shared/domain/Workflow";
import { Blueprint } from "@pretzel-graph/shared/domain/Foundations/Blueprint";
import { SystemError } from "@pretzel-graph/shared/domain/SystemError";
import { CatalogueService, RuntimeNode, mapFieldValues } from "@pretzel-graph/node-sdk";
import { decryptCredentialBlob } from "src/credentials";
import { AggexEngine } from "src/engine";

import { AggexCompilerError } from "../errors";
import { AirlockService } from "../airlock";
import { RealtimeService } from "../realtime";
import { WorkflowCompiler } from "./index";

// Builds the per-execution API facade injected into every node's ExecutionContext.
export function createExecutionAPIs(
    engine:              AggexEngine,
    airlock:             AirlockService,
    ctxRef:              { current: AggexEngine.Execution.Context },
    execution:           Execution,
    workflowData:        Workflow.Data,
    credentialInstances: Record<Vault.Credential.Instance.Id, Vault.Credential.Instance>,
    realtime:            RealtimeService,
) {
    const portAPI = {
        write: (nodeId, outputId, value) =>
            engine.nodeIO.writePort(ctxRef.current, nodeId, outputId, value),
    } satisfies RuntimeNode.ExecutionContext["portAPI"];

    const propagationAPI = {
        emitPort: (nodeId, outputId) =>
            engine.propagationAPI.emitPort(ctxRef.current, nodeId, outputId),
        emitNode: (nodeId) =>
            engine.propagationAPI.emitNode(ctxRef.current, nodeId),
    } satisfies RuntimeNode.ExecutionContext["propagationAPI"];

    const instanceRegistryAPI = {
        get:    (nodeId: Workflow.Node.Id) => engine.instanceRegistryAPI.get(nodeId),
        getAll: ()                         => engine.instanceRegistryAPI.getAll(),
    } satisfies RuntimeNode.ExecutionContext["instanceRegistryAPI"];

    const workflowQueryAPI = {
        getNodesByBlueprint: <T_Blueprint extends Blueprint>(blueprintId: T_Blueprint["id"]) =>
            Object.values(ctxRef.current.workflowData.nodes)
                .filter(n => n.blueprintId === blueprintId)
                .map(n => ({
                    node:   n,
                    fields: mapFieldValues<T_Blueprint>(
                        ctxRef.current.catalogueAPI.getBlueprint(n.id).fields,
                        ctxRef.current.workflowData.staticValues[n.id] ?? {},
                    ),
                })),
        getNodeOutput: (nodeId, portId) =>
            ctxRef.current.session.node_output_instances[nodeId]?.[portId],
    } satisfies RuntimeNode.ExecutionContext["workflowQueryAPI"];

    const schedulerAPI = {
        fireNode:      (nodeId, signals)    => engine.schedulerAPI.fireNode(ctxRef.current, nodeId, signals),
        signalNode:    (nodeId, fromNodeId) => engine.schedulerAPI.signalNode(ctxRef.current, nodeId, fromNodeId),
        removeSignal:  (nodeId, fromNodeId) => engine.schedulerAPI.removeSignal(ctxRef.current, nodeId, fromNodeId),
        clearSignals:  (nodeId)             => engine.schedulerAPI.clearSignals(ctxRef.current, nodeId),
        scheduleCheck: (nodeId)             => engine.schedulerAPI.scheduleCheck(ctxRef.current, nodeId),
    } satisfies RuntimeNode.ExecutionContext["schedulerAPI"];

    const subWorkflowAPI = {
        createEnv: () => {
            const subEngine   = new AggexEngine();
            const subCompiler = new WorkflowCompiler();
            return {
                // Reuse the SAME airlock ref → shared isolate (same tenant); the child
                // compile registers its own workflow copy + creates its own scope on it.
                compile: (workflowId, workflowData, execution, compilationCtx, enclosingNodeAPI) =>
                    subCompiler.compile(workflowId, workflowData, execution, realtime, subEngine, airlock, credentialInstances, compilationCtx, enclosingNodeAPI),
                run: (ctx: unknown) => subEngine.run(ctx as AggexEngine.Execution.Context),
            };
        },
    } satisfies RuntimeNode.ExecutionContext["subWorkflowAPI"];

    const dependencyAPI = {
        getPublished: (wfId: Workflow.Id) => {
            const dep = workflowData.dependencies?.published?.[wfId];
            if (!dep) throw new Error(`Missing published dependency "${wfId}"`);
            return dep;
        },
        getDraft: (wfId: Workflow.Id) => {
            const draft = workflowData.dependencies?.draft?.[wfId];
            if (!draft) throw new Error(`Missing draft dependency "${wfId}"`);
            return draft;
        },
    } satisfies RuntimeNode.ExecutionContext["dependencyAPI"];

    const catalogueAPI = {
        // Sync read of the resolved (post-reconcile) blueprint, warmed by prepareNode.
        getBlueprint: (nodeId: Workflow.Node.Id): Foundations.Blueprint => {
            const n = workflowData.nodes[nodeId];
            const bp = CatalogueService.getBlueprint(n.reconciledBlueprintId ?? n.blueprintId);
            if (!bp)
                throw new AggexCompilerError(
                    SystemError.Code.COMPILATION_NODE_NOT_FOUND,
                    `Blueprint not resolved for node "${nodeId}" (${n.blueprintId}) — catalogue cache not warmed`,
                    { data: { nodeId, blueprintId: n.blueprintId } }
                );
            return bp;
        },
    } satisfies RuntimeNode.ExecutionContext["catalogueAPI"];

    const credentialsAPI: RuntimeNode.ExecutionContext["credentialsAPI"] = {
        getInstance:       (instanceId) => credentialInstances[instanceId],
        getDecryptedValue: (blob)       => decryptCredentialBlob(blob) as any,
    };

    const abortController = new AbortController();
    const abortAPI = {
        signal: abortController.signal,
        abort:  (reason?: any) => abortController.abort(reason),
    };

    // Per-execution facade over the shared service: emit out, await signals in. awaitSignal
    // is bound to this execution's abort signal so parks reject + clean up on terminate/suspend.
    const realtimeAPI = {
        emit: <T_Event extends Realtime.Event>(event: T_Event) => realtime.emit(event),
        awaitSignal: <S>(channel: Realtime.Channel, schema: { parse: (data: unknown) => S }, timeout: number) =>
            realtime.awaitSignal(channel, schema, timeout, abortAPI.signal),
        emitAndAwaitSignal: <E extends Realtime.Event, S>(event: E, signalChannel: Realtime.Channel, signalSchema: { parse: (data: unknown) => S }, timeout: number) =>
            realtime.emitAndAwaitSignal(event, signalChannel, signalSchema, timeout, abortAPI.signal),
    } satisfies RuntimeNode.ExecutionContext["realtimeAPI"];

    const updateSession = (r: (draft: Execution.Session) => void) => {
        execution.session = produce(execution.session, r);
    };

    return {
        portAPI, propagationAPI, instanceRegistryAPI, workflowQueryAPI,
        schedulerAPI, subWorkflowAPI, dependencyAPI, credentialsAPI,
        catalogueAPI, abortAPI, realtimeAPI, updateSession,
    };
}
