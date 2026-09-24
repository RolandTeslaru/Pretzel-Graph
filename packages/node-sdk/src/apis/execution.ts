import type { Execution, Workflow } from "@pretzel-graph/shared/domain";
import type { Blueprint } from "@pretzel-graph/shared/domain/Foundations/Blueprint";
import type { Port } from "@pretzel-graph/shared/domain/Foundations/Port";
import type { CompilationContext } from "../compiler-context";
import type { LC } from "../langchain";
import type { RuntimeNode } from "../node/index";
import type { EnclosingNodeAPI } from "./node";



// Signal + trigger for cooperative cancellation of the whole execution (aborts async work in flight).
export interface AbortAPI {
    signal: AbortSignal,
    abort:  (reason?: any) => void,
}



// Manual fan-out: signal downstream dependents of one output port, or the whole node, outside
// the engine's automatic post-run propagation (used by "none"/"router" propagation strategies).
export interface PropagationAPI {
    emitPort: (
        nodeId: Workflow.Node.Id,
        outputId: Port.Output.Id,
    ) => void,
    emitNode: (
        nodeId: Workflow.Node.Id,
    ) => void,
}



// Looks up other live node instances in the same running execution by workflow node id.
export interface InstanceRegistryAPI {
    get:    (nodeId: Workflow.Node.Id) => RuntimeNode<Blueprint> | undefined,
    getAll: () => RuntimeNode<Blueprint>[],
}



// Low-level signal-graph control the S2Engine scheduler uses to fire nodes and manage the
// accumulated incoming signals that drive when a node is ready to run.
export interface SchedulerAPI {
    fireNode:      (nodeId: Workflow.Node.Id, signals?: Set<Workflow.Node.Id>) => void,
    signalNode:    (nodeId: Workflow.Node.Id, fromNodeId: Workflow.Node.Id) => void,
    removeSignal:  (nodeId: Workflow.Node.Id, fromNodeId: Workflow.Node.Id) => void,
    clearSignals:  (nodeId: Workflow.Node.Id) => void,
    scheduleCheck: (nodeId: Workflow.Node.Id) => void,
}



// Creates a nested compile/run environment for executing a sub-workflow (used by
// Core.SubWorkflow.Execute) — compiles the child graph and runs it to completion.
export interface SubWorkflowAPI {
    createEnv: () => {
        compile: (
            workflowId: Workflow.Id,
            workflowData: Workflow.Data,
            execution: Execution,
            compilationCtx: CompilationContext,
            enclosingNodeAPI?: EnclosingNodeAPI,
        ) => Promise<unknown>,
        run: (ctx: unknown) => Promise<unknown>,
    }
}



/**
 * A short-lived MCP endpoint backed by live tools from the current execution.
 * The endpoint is loopback-only; callers must still send the bearer token.
 */
export interface AgentToolBinding {
    readonly url:         string,
    readonly bearerToken: string,
    readonly toolNames:   readonly string[],
    close: () => Promise<void>,
}



/**
 * Makes in-memory LangChain tools available to an external agent process through MCP.
 * Implemented by the worker so transport lifetime follows the workflow execution.
 */
export interface AgentToolBridgeAPI {
    bind: (
        tools: readonly LC.Tool[],
        options?: { timeoutMs?: number },
    ) => Promise<AgentToolBinding>,
}



/** How a workflow run ended. */
export type ExecutionOutcome = "completed" | "terminated" | "failed"
