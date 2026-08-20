"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createExecutionAPIs = createExecutionAPIs;
const immer_1 = require("immer");
const domain_1 = require("../../../shared/domain");
const SystemError_1 = require("../../../shared/domain/SystemError");
const node_sdk_1 = require("../../../node-sdk/src/index.js");
const credentials_1 = require("../credentials");
const engine_1 = require("../engine");
const errors_1 = require("../errors");
const index_1 = require("./index");
const http_1 = require("./http");
const proxy_1 = require("./proxy");
const service_1 = require("../tool-bridge/service");
// Builds the per-execution API facade injected into every node's ExecutionContext.
function createExecutionAPIs(engine, airlock, ctxRef, execution, workflowId, workflowData, credentialInstances, realtime, internalAPI) {
    const portAPI = {
        write: (nodeId, outputId, value) => engine.services.nodeIO.writePort(ctxRef.current, nodeId, outputId, value),
    };
    const propagationAPI = {
        emitPort: (nodeId, outputId) => engine.propagationAPI.emitPort(ctxRef.current, nodeId, outputId),
        emitNode: (nodeId) => engine.propagationAPI.emitNode(ctxRef.current, nodeId),
    };
    const instanceRegistryAPI = {
        get: (nodeId) => engine.instanceRegistryAPI.get(nodeId),
        getAll: () => engine.instanceRegistryAPI.getAll(),
    };
    const workflowQueryAPI = {
        getNode: (nodeId) => ctxRef.current.workflowData.nodes[nodeId],
        getNodeOutput: (nodeId, portId) => ctxRef.current.session.node_output_instances[nodeId]?.[portId],
        getInputs: (nodeId) => ctxRef.current.workflowCache.resolvedShape[nodeId].inputs,
        getOutputs: (nodeId) => ctxRef.current.workflowCache.resolvedShape[nodeId].outputs,
        getOutputPort: (nodeId, portId) => ctxRef.current.workflowCache.resolvedShape[nodeId].outputs.find(p => p.id === portId),
        getInputPort: (nodeId, portId) => ctxRef.current.workflowCache.resolvedShape[nodeId].inputs.find(p => p.id === portId),
        getFields: (nodeId) => ctxRef.current.workflowCache.resolvedShape[nodeId].fields,
        getStaticValues: (nodeId) => ctxRef.current.workflowData.staticValues[nodeId] ?? {},
        getExpressionTaggedFieldIds: (nodeId) => ctxRef.current.workflowData.fieldExpressions?.[nodeId] ?? {},
        getNodesByBlueprint: (blueprintId) => Object.values(ctxRef.current.workflowData.nodes)
            .filter(n => n.blueprintId === blueprintId)
            .map(n => ({
            node: n,
            fields: (0, node_sdk_1.mapFieldValues)(ctxRef.current.catalogueAPI.getBlueprint(n.id).fields, ctxRef.current.workflowData.staticValues[n.id] ?? {}),
        })),
        getNodeDependency: (nodeId) => {
            const depRef = ctxRef.current.workflowData.nodes[nodeId]?.dependencyRef;
            if (!depRef) {
                return null;
            }
            const store = depRef.mode === "publication"
                ? ctxRef.current.workflowData.dependencies.published
                : ctxRef.current.workflowData.dependencies.draft;
            return store[depRef.workflowId] ?? null;
        },
    };
    const schedulerAPI = {
        fireNode: (nodeId, signals) => engine.schedulerAPI.fireNode(ctxRef.current, nodeId, signals),
        signalNode: (nodeId, fromNodeId) => engine.schedulerAPI.signalNode(ctxRef.current, nodeId, fromNodeId),
        removeSignal: (nodeId, fromNodeId) => engine.schedulerAPI.removeSignal(ctxRef.current, nodeId, fromNodeId),
        clearSignals: (nodeId) => engine.schedulerAPI.clearSignals(ctxRef.current, nodeId),
        scheduleCheck: (nodeId) => engine.schedulerAPI.scheduleCheck(ctxRef.current, nodeId),
    };
    const airlockAPI = airlock.createScope(workflowId, {
        igniter: execution.igniter,
    });
    const subWorkflowAPI = {
        createEnv: () => {
            const subEngine = new engine_1.AggexEngine();
            const subCompiler = new index_1.TurboGraph();
            return {
                // Same airlock ref → shared isolate (same tenant); same internalAPI → the sub-workflow
                // reuses the parent execution id, so the parent token is the right credential for it.
                compile: (workflowId, workflowData, execution, compilationCtx, enclosingNodeAPI) => subCompiler.compile(workflowId, workflowData, execution, realtime, subEngine, airlock, credentialInstances, internalAPI, compilationCtx, enclosingNodeAPI),
                run: (ctx) => subEngine.run(ctx),
            };
        },
    };
    const dependencyAPI = {
        getPublished: (wfId) => {
            const dep = workflowData.dependencies?.published?.[wfId];
            if (!dep) {
                throw new Error(`Missing published dependency "${wfId}"`);
            }
            return dep;
        },
        getDraft: (wfId) => {
            const draft = workflowData.dependencies?.draft?.[wfId];
            if (!draft) {
                throw new Error(`Missing draft dependency "${wfId}"`);
            }
            return draft;
        },
    };
    const catalogueAPI = {
        // Sync read of the resolved derivative blueprint, warmed by prepareNode.
        getBlueprint: (nodeId) => {
            const n = workflowData.nodes[nodeId];
            const bp = node_sdk_1.CatalogueService.getBlueprint(n.reconciledBlueprintId ?? n.blueprintId);
            if (!bp) {
                throw new errors_1.AggexCompilerError(SystemError_1.SystemError.Code.COMPILATION_NODE_NOT_FOUND, `Blueprint not resolved for node "${nodeId}" (${n.blueprintId}) — catalogue cache not warmed`, { data: { nodeId, blueprintId: n.blueprintId } });
            }
            return bp;
        },
    };
    const credentialsAPI = {
        getInstance: (instanceId) => credentialInstances[instanceId],
        getDecryptedValue: (blob) => (0, credentials_1.decryptCredentialBlob)(blob),
    };
    const abortController = new AbortController();
    const abortAPI = {
        signal: abortController.signal,
        abort: (reason) => abortController.abort(reason),
    };
    const agentToolBridgeAPI = service_1.agentToolBridgeService.createAPI(abortAPI.signal);
    // Outbound HTTP for integration nodes — bound to this execution's abort signal, so
    // terminate/suspend cancels vendor requests in flight.
    const proxyAPI = (0, proxy_1.createProxyAPI)(workflowData, credentialInstances);
    const httpAPI = (0, http_1.createHTTPClientAPI)(abortAPI.signal);
    // The scope already carries the execution ids and the subscription, so binding the abort
    // signal is all that is left — parks reject and clean up on terminate/suspend. This view
    // is what nodes receive; it withholds close().
    const realtimeAPI = realtime.withAbort(abortAPI.signal);
    const updateSession = (r) => {
        execution.session = (0, immer_1.produce)(execution.session, r);
    };
    // Parks the node until the user answers. The pending request is mirrored onto the session
    // so a client that joins mid-run can rebuild the card; the finally clears it on every exit
    // path, since the park also rejects on timeout and on terminate/suspend.
    //
    // The card is rendered from inside awaitSignalAfter, so the waiter is already registered
    // when it appears — an instant answer has no gap to fall into. Several consultations can
    // be parked on one execution, so the match narrows by id: the type alone would resolve
    // whichever waiter the reply reached first.
    const consultationAPI = {
        consult: async ({ requestSchema, request, answerSchema, onOpen }) => {
            // Stamped first, then parsed whole — the node never sees id/startedAt, and what
            // lands in pending_consultations is a validated request.
            const pendingConsultation = requestSchema.parse({
                ...request,
                id: crypto.randomUUID(),
                startedAt: Date.now(),
            });
            try {
                const signalResponse = await realtimeAPI.awaitSignalAfter(domain_1.Consultation.Signal.Answer, sig => sig.consultationId === pendingConsultation.id, pendingConsultation.timeoutMs, async () => {
                    updateSession(d => {
                        d.pending_consultations[pendingConsultation.id] = pendingConsultation;
                    });
                    realtimeAPI.emit(domain_1.Execution.Event.create("session:patch", {
                        sessionPatch: {
                            upsert: {
                                pending_consultations: { [pendingConsultation.id]: pendingConsultation },
                            },
                        },
                    }));
                    // Last, and inside the armed window: whatever invites the answer runs
                    // only once the card exists and the waiter can catch an instant reply.
                    await onOpen?.(pendingConsultation);
                });
                const answer = answerSchema.parse(signalResponse.answer);
                // Acknowledgement for the respond route — it only reports success once the
                // answer has actually been consumed here.
                realtimeAPI.emit(domain_1.Consultation.Event.create("consultation:resolved", {
                    consultationId: pendingConsultation.id,
                }));
                return answer;
            }
            finally {
                updateSession(d => {
                    delete d.pending_consultations[pendingConsultation.id];
                });
                realtimeAPI.emit(domain_1.Execution.Event.create("session:patch", {
                    sessionPatch: {
                        delete: {
                            pending_consultations: { [pendingConsultation.id]: true },
                        },
                    },
                }));
            }
        },
    };
    return {
        portAPI,
        propagationAPI,
        instanceRegistryAPI,
        workflowQueryAPI,
        schedulerAPI,
        subWorkflowAPI,
        dependencyAPI,
        credentialsAPI,
        catalogueAPI,
        abortAPI,
        realtimeAPI,
        updateSession,
        airlockAPI,
        httpAPI,
        proxyAPI,
        agentToolBridgeAPI,
        internalAPI,
        consultationAPI,
    };
}
