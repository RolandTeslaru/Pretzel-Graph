import { Execution, Vault, Workflow } from "@pretzel-graph/shared/domain";
import type { ConnectionAPI, HTTP, RuntimeNode } from "@pretzel-graph/node-sdk";
import type { Blueprint } from "@pretzel-graph/shared/domain/Foundations/Blueprint";
import type { AggexEngine } from "../engine";
import { S2Graph, Vertex } from "../S2/graph";
import type { AirlockService } from "../airlock";
import { createExecutionAPIs } from "../turboGraph/apis";
import type { CatalogueService } from "../catalogue";

export type ExecutionAPIs = Pick<
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
    | "connectionAPI"
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

export class ExecutionContext implements RuntimeNode.ExecutionContext {

    private readonly execution: Execution;

    readonly executionId: Execution.Id;
    readonly igniter:     Execution.Igniter;

    readonly workflowId:   Workflow.Id;
    readonly workflowData: Workflow.Data;
    readonly airlock:      AirlockService;

    workflowCache!: Workflow.Cache;

    readonly compiledGraph = new S2Graph();
    readonly activeNodes   = new Set<Workflow.Node.Id | Vertex.Id>();
    readonly errorChannel  = new Map<Workflow.Edge.Id, AggexEngine.Execution.ErrorEnvelope>();
    readonly nodeRuntimeMap = new Map<Workflow.Node.Id | Vertex.Id, {
        wfNode:   Workflow.Node.Raw;
        instance: RuntimeNode<Blueprint>;
    }>();
    readonly stopAtNodeId?: Workflow.Node.Id;

    readonly portAPI!:             ExecutionAPIs["portAPI"];
    readonly propagationAPI!:      ExecutionAPIs["propagationAPI"];
    readonly instanceRegistryAPI!: ExecutionAPIs["instanceRegistryAPI"];
    readonly workflowQueryAPI!:    ExecutionAPIs["workflowQueryAPI"];
    readonly schedulerAPI!:        ExecutionAPIs["schedulerAPI"];
    readonly subWorkflowAPI!:      ExecutionAPIs["subWorkflowAPI"];
    readonly dependencyAPI!:       ExecutionAPIs["dependencyAPI"];
    readonly credentialsAPI!:      ExecutionAPIs["credentialsAPI"];
    readonly catalogueAPI!:        ExecutionAPIs["catalogueAPI"];
    readonly connectionAPI!:       ExecutionAPIs["connectionAPI"];
    readonly abortAPI!:            ExecutionAPIs["abortAPI"];
    readonly realtimeAPI!:         ExecutionAPIs["realtimeAPI"];
    readonly updateSession!:       ExecutionAPIs["updateSession"];
    readonly airlockAPI!:          ExecutionAPIs["airlockAPI"];
    readonly httpAPI!:             ExecutionAPIs["httpAPI"];
    readonly proxyAPI!:            ExecutionAPIs["proxyAPI"];
    readonly agentToolBridgeAPI!:  ExecutionAPIs["agentToolBridgeAPI"];
    readonly internalAPI!:         ExecutionAPIs["internalAPI"];
    readonly consultationAPI!:     ExecutionAPIs["consultationAPI"];
    readonly enclosingNodeAPI?:    RuntimeNode.ExecutionContext["enclosingNodeAPI"];

    constructor(
        engine:  AggexEngine,
        options: ExecutionContext.Options,
    ) {
        const {
            execution, workflowId, workflowData, airlock, credentialInstances,
            realtime, internalAPI, catalogue, connectionAPI, enclosingNodeAPI,
        } = options;

        this.execution       = execution;
        this.executionId     = execution.id;
        this.igniter         = execution.igniter;
        this.workflowId      = workflowId;
        this.workflowData    = workflowData;
        this.airlock         = airlock;
        this.enclosingNodeAPI = enclosingNodeAPI;
        this.stopAtNodeId    = execution.igniter.variant === "workbench_step"
            ? execution.igniter.targetNodeId
            : undefined;

        // Registered before the APIs are built: the airlock scope among them needs the @workflow copy.
        airlock.registerWorkflow(workflowId, workflowData);

        Object.assign(this, createExecutionAPIs(
            engine,
            this,
            execution,
            credentialInstances,
            realtime,
            internalAPI,
            catalogue,
            connectionAPI,
        ));
    }

    get session(): Execution.Session {
        return this.execution.session;
    }
}

export namespace ExecutionContext {

    export interface Options {
        execution:           Execution;
        workflowId:          Workflow.Id;
        workflowData:        Workflow.Data;
        airlock:             AirlockService;
        credentialInstances: Record<Vault.Credential.Instance.Id, Vault.Credential.Instance>;
        realtime:            RuntimeNode.RealtimeScope;
        internalAPI:         HTTP.Client;
        catalogue:           CatalogueService;
        connectionAPI:       ConnectionAPI;
        enclosingNodeAPI?:   RuntimeNode.ExecutionContext["enclosingNodeAPI"];
    }
}
