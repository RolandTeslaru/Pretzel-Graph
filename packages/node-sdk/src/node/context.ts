import { Airlock, Execution, Workflow } from "@pretzel-graph/shared/domain";
import {
    RealtimeAPI,
    CatalogueAPI,
    CredentialsAPI,
    AbortAPI,
    PortAPI,
    PropagationAPI,
    InstanceRegistryAPI,
    WorkflowQueryAPI,
    SchedulerAPI,
    EnclosingNodeAPI,
    SubWorkflowAPI,
    DependencyAPI,
    AgentToolBridgeAPI,
} from "./apis";
import { HTTP } from "../domain/http";
import { NetworkProxy } from "../domain/networkProxy";

export interface ExecutionContext {
    readonly executionId:             Execution.Id,
    readonly igniter:                 Execution.Igniter,
    readonly session:                 Execution.Session,
    readonly updateSession:           (recipe: (draft: Execution.Session) => void) => void,

    readonly workflowId:              Workflow.Id,
    readonly workflowData:            Workflow.Data,
    readonly workflowCache:           Workflow.Cache,

    // APIS
    readonly realtimeAPI:             RealtimeAPI,
    readonly catalogueAPI:            CatalogueAPI,
    readonly airlockAPI:              Airlock.API,
    readonly credentialsAPI:          CredentialsAPI,
    readonly abortAPI:                AbortAPI,
    readonly portAPI:                 PortAPI,
    readonly propagationAPI:          PropagationAPI,
    readonly instanceRegistryAPI:     InstanceRegistryAPI,
    readonly workflowQueryAPI:        WorkflowQueryAPI,
    readonly schedulerAPI:            SchedulerAPI,
    readonly enclosingNodeAPI?:       EnclosingNodeAPI,
    readonly subWorkflowAPI:          SubWorkflowAPI,
    readonly dependencyAPI:           DependencyAPI,
    readonly httpAPI:                 HTTP.ClientAPI,
    readonly proxyAPI:                NetworkProxy.API,
    readonly agentToolBridgeAPI:      AgentToolBridgeAPI,
}
