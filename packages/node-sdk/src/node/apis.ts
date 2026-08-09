import { Execution, Foundations, Realtime, Vault, Workflow } from "@pretzel-graph/shared/domain";
import { Blueprint } from "@pretzel-graph/shared/domain/Foundations/Blueprint";
import { Port } from "@pretzel-graph/shared/domain/Foundations/Port";
import type { CompilationContext } from "../compiler-context";
import type { InferCredentialValues, InferFieldValues } from "../types";
import type { RuntimeNode } from "./index";
import type { LC } from "../langchain";

// Publishes execution events over the websocket, and lets a node emit-then-block until a
// matching signal event comes back (e.g. human review, external webhook confirmation).
export interface RealtimeAPI {
    emit: <T_Event extends Realtime.Event>(event: T_Event) => void,
    awaitSignal: <S>(
        channel: Realtime.Channel,
        schema:  { parse: (data: unknown) => S },
        timeout: number,
    ) => Promise<S>,
    emitAndAwaitSignal: <E extends Realtime.Event, S>(
        event:         E,
        signalChannel: Realtime.Channel,
        signalSchema:  { parse: (data: unknown) => S },
        timeout:       number,
    ) => Promise<S>,
}

// Resolves each node's derivative blueprint from the catalogue cache (warmed by the
// compiler). Read sites join against this instead of the slim workflow node.
export interface CatalogueAPI {
    getBlueprint: (nodeId: Workflow.Node.Id) => Foundations.Blueprint,
}

// Looks up a stored credential instance and decrypts an encrypted blob off it.
export interface CredentialsAPI {
    getInstance:       (instanceId: Vault.Credential.Instance.Id) => Vault.Credential.Instance | undefined,
    getDecryptedValue: <T = unknown>(blob: Vault.Credential.Instance.EncryptedBlob<T>) => InferCredentialValues<T>,
}

// Signal + trigger for cooperative cancellation of the whole execution (aborts async work in flight).
export interface AbortAPI {
    signal: AbortSignal,
    abort:  (reason?: any) => void,
}

// Writes a value onto one of this node's output ports so downstream nodes can read it.
export interface PortAPI {
    write: (
        nodeId: Workflow.Node.Id,
        outputId: Port.Output.Id,
        value: unknown,
    ) => void,
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

// Finds other nodes in the workflow by blueprint id, and reads a node's already-produced output.
export interface WorkflowQueryAPI {
    getNodesByBlueprint: <T_Blueprint extends Blueprint>(blueprintId: Foundations.Blueprint.Id) => Array<{
        node: Workflow.Node.Raw,
        fields: InferFieldValues<T_Blueprint>,
    }>,
    getNode:       (nodeId: Workflow.Node.Id) => Workflow.Node.Raw | undefined,
    getNodeOutput: (nodeId: Workflow.Node.Id, portId: Port.Output.Id) => unknown,
    getInputs:     (nodeId: Workflow.Node.Id) => Port.Input[],
    getOutputs:    (nodeId: Workflow.Node.Id) => Port.Output[],
    getFields:     (nodeId: Workflow.Node.Id) => readonly Foundations.Field[],
    getNodeDependency: (nodeId: Workflow.Node.Id) => Workflow.Dependency | null,
    getOutputPort: (nodeId: Workflow.Node.Id, portId: Port.Output.Id) => Port.Output | undefined,
    getInputPort:  (nodeId: Workflow.Node.Id, portId: Port.Input.Id) => Port.Input | undefined,
    getStaticValues: (nodeId: Workflow.Node.Id) => Record<Foundations.Field.Id, Foundations.Field.Value>,
    /** Per-node static/expression overrides. Absent key = no user choice; see Field.usesExpression. */
    getExpressionTaggedFieldIds: (nodeId: Workflow.Node.Id) => Record<Foundations.Field.Id, boolean>,
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

// Given to a sub-workflow's ExposeOutputPort nodes so they can write/emit directly on the
// parent Execute-sub-workflow node's own ports as they fire, bypassing normal port wiring.
export interface EnclosingNodeAPI {
    writePort: (
        outputId: Port.Output.Id,
        value: unknown,
    ) => void,
    emitPort: (
        outputId: Port.Output.Id,
    ) => void,
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

// Reads another workflow's published or draft dependency snapshot (used to resolve sub-workflows).
export interface DependencyAPI {
    getPublished: (workflowId: Workflow.Id) => Workflow.Dependency.Publication,
    getDraft:     (workflowId: Workflow.Id) => Workflow.Dependency.Draft,
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
