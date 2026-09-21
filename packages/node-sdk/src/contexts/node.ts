import type { Airlock, Execution, Workflow } from "@pretzel-graph/shared/domain";
import type {
    AbortAPI,
    AgentToolBridgeAPI,
    ConsultationAPI,
    DependencyAPI,
    EnclosingNodeAPI,
    InstanceRegistryAPI,
    PortAPI,
    PropagationAPI,
    RealtimeAPI,
    SchedulerAPI,
    SubWorkflowAPI,
    WorkflowQueryAPI,
} from "../apis";
import type { HTTP } from "../domain/http";
import type { NetworkProxy } from "../domain/networkProxy";
import type { ConnectionAPI } from "../apis/resources";
import type { HostContext } from "./host";

// What a firing node sees. Deliberately narrower than the worker's ExecutionContext: the engine's
// own state — compiled graph, active nodes, error channel, raw workflow data and cache — stays out.
// Everything a node needs from the workflow comes through workflowQueryAPI.
export interface NodeContext extends HostContext {
    readonly executionId:         Execution.Id,
    readonly igniter:             Execution.Igniter,
    readonly session:             Execution.Session,
    readonly updateSession:       (recipe: (draft: Execution.Session) => void) => void,

    readonly workflowId:          Workflow.Id,

    readonly connectionAPI:       ConnectionAPI,
    readonly realtimeAPI:         RealtimeAPI,
    readonly airlockAPI:          Airlock.API,
    readonly abortAPI:            AbortAPI,
    readonly portAPI:             PortAPI,
    readonly propagationAPI:      PropagationAPI,
    readonly instanceRegistryAPI: InstanceRegistryAPI,
    readonly workflowQueryAPI:    WorkflowQueryAPI,
    readonly schedulerAPI:        SchedulerAPI,
    readonly enclosingNodeAPI?:   EnclosingNodeAPI,
    readonly subWorkflowAPI:      SubWorkflowAPI,
    readonly dependencyAPI:       DependencyAPI,
    readonly consultationAPI:     ConsultationAPI,
    readonly agentToolBridgeAPI:  AgentToolBridgeAPI,

    /** Backend internal routes. Carries this execution's token and is NOT proxied —
     *  never build one from httpClientFactory, that would send the token through the
     *  node's proxy credential. Third-party egress belongs on httpClientFactory. */
    readonly internalAPI:         HTTP.Client,
    readonly httpAPI:             HTTP.ClientAPI,
    readonly proxyAPI:            NetworkProxy.API,
}
