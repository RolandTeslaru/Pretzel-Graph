import { produce } from "immer";
import { Consultation, Execution, Vault } from "@pretzel-graph/shared/domain";
import { Workflow } from "@pretzel-graph/shared/domain/Workflow";
import { Blueprint } from "@pretzel-graph/shared/domain/Foundations/Blueprint";
import { SystemError } from "@pretzel-graph/shared/domain/SystemError";
import { CatalogueService, HTTP, RuntimeNode, mapFieldValues } from "@pretzel-graph/node-sdk";
import { decryptCredentialBlob } from "src/credentials";
import { AggexEngine } from "src/engine";

import { AggexCompilerError } from "../errors";
import { AirlockService } from "../airlock";
import { TurboGraph } from "./index";
import { createHTTPClientAPI } from "./http";
import { createProxyAPI } from "./proxy";
import { agentToolBridgeService } from "../tool-bridge/service";

type ExecutionAPIs = Pick<
    RuntimeNode.ExecutionContext,
    | "portAPI"
    | "propagationAPI"
    | "instanceRegistryAPI"
    | "workflowQueryAPI"
    | "schedulerAPI"
    | "subWorkflowAPI"
    | "dependencyAPI"
    | "credentialsAPI"
    | "catalogueAPI"
    | "abortAPI"
    | "realtimeAPI"
    | "updateSession"
    | "airlockAPI"
    | "httpAPI"
    | "proxyAPI"
    | "agentToolBridgeAPI"
    | "internalAPI"
    | "consultationAPI"
>;

// Builds the per-execution API facade injected into every node's ExecutionContext.
export function createExecutionAPIs(
    engine:              AggexEngine,
    airlock:             AirlockService,
    ctxRef:              { current: AggexEngine.Execution.Context },
    execution:           Execution,
    workflowId:          Workflow.Id,
    workflowData:        Workflow.Data,
    credentialInstances: Record<Vault.Credential.Instance.Id, Vault.Credential.Instance>,
    realtime:            RuntimeNode.RealtimeScope,
    internalAPI:         HTTP.Client,
): ExecutionAPIs {
    const portAPI = {
        write: (nodeId, outputId, value) => engine.services.nodeIO.writePort(ctxRef.current, nodeId, outputId, value),
    } satisfies RuntimeNode.ExecutionContext["portAPI"];




    const propagationAPI = {
        emitPort: (nodeId, outputId) => engine.propagationAPI.emitPort(ctxRef.current, nodeId, outputId),
        emitNode: (nodeId)           => engine.propagationAPI.emitNode(ctxRef.current, nodeId),
    } satisfies RuntimeNode.ExecutionContext["propagationAPI"];




    const instanceRegistryAPI = {
        get:    (nodeId) => engine.instanceRegistryAPI.get(nodeId),
        getAll: ()       => engine.instanceRegistryAPI.getAll(),
    } satisfies RuntimeNode.ExecutionContext["instanceRegistryAPI"];




    const workflowQueryAPI = {
        getNode:                     (nodeId)         => ctxRef.current.workflowData.nodes[nodeId],
        getNodeOutput:               (nodeId, portId) => ctxRef.current.session.node_output_instances[nodeId]?.[portId],
        getInputs:                   (nodeId)         => ctxRef.current.workflowCache.resolvedShape[nodeId].inputs,
        getOutputs:                  (nodeId)         => ctxRef.current.workflowCache.resolvedShape[nodeId].outputs,
        getOutputPort:               (nodeId, portId) => ctxRef.current.workflowCache.resolvedShape[nodeId].outputs.find(p => p.id === portId),
        getInputPort:                (nodeId, portId) => ctxRef.current.workflowCache.resolvedShape[nodeId].inputs.find(p => p.id === portId),
        getFields:                   (nodeId)         => ctxRef.current.workflowCache.resolvedShape[nodeId].fields,
        getStaticValues:             (nodeId)         => ctxRef.current.workflowData.staticValues[nodeId] ?? {},
        getExpressionTaggedFieldIds: (nodeId)         => ctxRef.current.workflowData.fieldExpressions?.[nodeId] ?? {},

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
    } satisfies RuntimeNode.ExecutionContext["workflowQueryAPI"];




    const schedulerAPI = {
        fireNode:      (nodeId, signals)    => engine.schedulerAPI.fireNode(ctxRef.current, nodeId, signals),
        signalNode:    (nodeId, fromNodeId) => engine.schedulerAPI.signalNode(ctxRef.current, nodeId, fromNodeId),
        removeSignal:  (nodeId, fromNodeId) => engine.schedulerAPI.removeSignal(ctxRef.current, nodeId, fromNodeId),
        clearSignals:  (nodeId)             => engine.schedulerAPI.clearSignals(ctxRef.current, nodeId),
        scheduleCheck: (nodeId)             => engine.schedulerAPI.scheduleCheck(ctxRef.current, nodeId),
    } satisfies RuntimeNode.ExecutionContext["schedulerAPI"];




    const airlockAPI = airlock.createScope(workflowId, {
        igniter: execution.igniter,
    });




    const subWorkflowAPI = {
        createEnv: () => {
            const subEngine   = new AggexEngine();
            const subCompiler = new TurboGraph();

            return {
                // Same airlock ref → shared isolate (same tenant); same internalAPI → the sub-workflow
                // reuses the parent execution id, so the parent token is the right credential for it.
                compile: (workflowId, workflowData, execution, compilationCtx, enclosingNodeAPI) =>
                    subCompiler.compile(workflowId, workflowData, execution, realtime, subEngine, airlock, credentialInstances, internalAPI, compilationCtx, enclosingNodeAPI),

                run: (ctx: unknown) => subEngine.run(ctx as AggexEngine.Execution.Context),
            };
        },
    } satisfies RuntimeNode.ExecutionContext["subWorkflowAPI"];




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
    } satisfies RuntimeNode.ExecutionContext["dependencyAPI"];




    const catalogueAPI = {
        // Sync read of the resolved derivative blueprint, warmed by prepareNode.
        getBlueprint: (nodeId) => {
            const n  = workflowData.nodes[nodeId];
            const bp = CatalogueService.getBlueprint(n.reconciledBlueprintId ?? n.blueprintId);

            if (!bp) {
                throw new AggexCompilerError(
                    SystemError.Code.COMPILATION_NODE_NOT_FOUND,
                    `Blueprint not resolved for node "${nodeId}" (${n.blueprintId}) — catalogue cache not warmed`,
                    { data: { nodeId, blueprintId: n.blueprintId } },
                );
            }

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




    const agentToolBridgeAPI = agentToolBridgeService.createAPI(abortAPI.signal);




    // Outbound HTTP for integration nodes — bound to this execution's abort signal, so
    // terminate/suspend cancels vendor requests in flight.
    const proxyAPI = createProxyAPI(workflowData, credentialInstances);
    const httpAPI  = createHTTPClientAPI(abortAPI.signal);




    // The scope already carries the execution ids and the subscription, so binding the abort
    // signal is all that is left — parks reject and clean up on terminate/suspend. This view
    // is what nodes receive; it withholds close().
    const realtimeAPI = realtime.withAbort(abortAPI.signal);




    const updateSession = (r: (draft: Execution.Session) => void) => {
        execution.session = produce(execution.session, r);
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
        consult: async (resolutionSchema, props) => {
            const pendingConsultation: Consultation.Request = {
                ...props,
                id:        crypto.randomUUID() as Consultation.Id,
                startedAt: Date.now(),
            };

            try {
                const signalResponse = await realtimeAPI.awaitSignalAfter(
                    Consultation.Signal.Responded,
                    sig => sig.consultationId === pendingConsultation.id,
                    pendingConsultation.timeoutMs,
                    () => {
                        updateSession(d => {
                            d.pending_consultations[pendingConsultation.id] = pendingConsultation;
                        });

                        realtimeAPI.emit(Execution.Event.create("patch", {
                            sessionPatch: {
                                upsert: {
                                    pending_consultations: { [pendingConsultation.id]: pendingConsultation },
                                },
                            },
                        }));
                    },
                );

                const resolution = resolutionSchema.parse(signalResponse.consultationResolution);

                // Acknowledgement for the respond route — it only reports success once the
                // answer has actually been consumed here.
                realtimeAPI.emit(Consultation.Event.create("consultation:resolved", {
                    consultationId: pendingConsultation.id,
                }));

                return resolution;
            } finally {
                updateSession(d => {
                    delete d.pending_consultations[pendingConsultation.id];
                });

                realtimeAPI.emit(Execution.Event.create("patch", {
                    sessionPatch: {
                        delete: {
                            pending_consultations: { [pendingConsultation.id]: true },
                        },
                    },
                }));
            }
        },
    } satisfies RuntimeNode.ExecutionContext["consultationAPI"];




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
