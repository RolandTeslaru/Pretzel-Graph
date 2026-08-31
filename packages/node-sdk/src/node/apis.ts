import type { z } from "zod";
import { Consultation, Execution, Foundations, Vault, Workflow } from "@pretzel-graph/shared/domain";
import { Blueprint } from "@pretzel-graph/shared/domain/Foundations/Blueprint";
import { Port } from "@pretzel-graph/shared/domain/Foundations/Port";
import type { CompilationContext } from "../compiler-context";
import type { InferCredentialValues, InferFieldValues } from "../types";
import type { RuntimeNode } from "./index";
import type { LC } from "../langchain";



/**
 * One execution's whole realtime surface, held by the runtime host. Events go out on that
 * execution's channel; signals come in on its signal channel, routed by schema and
 * correlation predicate.
 *
 * No method takes an id, a channel, or an abort signal — the binding supplies all three,
 * which is what makes it impossible to address another execution by accident.
 */
export interface RealtimeScope {
    /** Build it with the owning namespace's `create`; emit stamps the addressing. */
    emit: (event: Execution.Event.Unstamped) => void,

    /** Permanent handler. Returns its own unregister. */
    onSignal: <S extends Execution.Signal.Base>(
        schema:  z.ZodType<S>,
        handler: (signal: S) => void,
    ) => () => void,

    /**
     * Park until a signal passes both filters, or reject on timeout / terminate / suspend.
     *
     * `match` is required: schema alone cannot separate two nodes parked on the same kind
     * of signal, so without it the first reply would resolve both.
     */
    awaitSignal: <S extends Execution.Signal.Base>(
        schema:  z.ZodType<S>,
        match:   (signal: S) => boolean,
        timeout: number,
    ) => Promise<S>,

    /**
     * awaitSignal, with the waiter registered BEFORE `action` runs — for anything that
     * invites the reply it is about to wait for. An instant responder cannot slip into the
     * gap between triggering and waiting, because there is none.
     */
    awaitSignalAfter: <S extends Execution.Signal.Base>(
        schema:  z.ZodType<S>,
        match:   (signal: S) => boolean,
        timeout: number,
        action:  () => void | Promise<void>,
    ) => Promise<S>,

    /** A view whose parks also reject when `abortSignal` fires (terminate/suspend). */
    withAbort: (abortSignal: AbortSignal) => RealtimeAPI,

    /** Unsubscribes and rejects whatever is still parked. Withheld from nodes. */
    close: () => void,
}

/**
 * What a node holds: the scope minus the lifecycle controls only the host should reach.
 * Picked from the scope so the two can never drift — a capability added to the scope is
 * withheld by default, and sharing it is an explicit edit here.
 */
export type RealtimeAPI = Pick<
    RealtimeScope,
    | "emit"
    | "onSignal"
    | "awaitSignal"
    | "awaitSignalAfter"
>;


// Resolves each node's derivative blueprint from the catalogue cache (warmed by the
// compiler). Read sites join against this instead of the slim workflow node.
export interface CatalogueAPI {
    getBlueprint: (nodeId: Workflow.Node.Id) => Foundations.Blueprint,
}

// Looks up a stored credential instance and decrypts an encrypted blob off it.
export interface CredentialsAPI {
    getInstance:       (instanceId: Vault.Credential.Instance.Id) => Vault.Credential.Instance | undefined,
    getDecryptedValue: <T = unknown>(blob: Vault.Credential.Instance.EncryptedBlob<T>) => InferCredentialValues<T>,
    // OAuth2 instances only. Resolves to a token valid for at least the next minute.
    getAccessToken:    (instanceId: Vault.Credential.Instance.Id) => Promise<string>,
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




/**
 * What a node hands to `consult`, which stamps `id` and `startedAt` itself. Lives here
 * rather than in the domain because those two fields are only absent in transit to this
 * one call — a stored `Consultation.Request` always has them.
 *
 * Generic, so a domain extending `Request` keeps its own props on the way through;
 * distributive, so a domain whose `Request` is a union keeps each member's props rather
 * than collapsing to their intersection.
 */
export type UnstampedConsultationRequest<
    T_Request = Consultation.Request,
> = T_Request extends unknown ? Omit<T_Request, "id" | "startedAt"> : never;

/**
 * Ask the human something and park until they answer. Mirrors the request onto the session
 * so a client joining mid-run rebuilds the card, and rejects on timeout, terminate, or
 * suspend.
 *
 * Both schemas are the specific variant, not the domain's whole union: `requestSchema`
 * types the request argument and validates it once stamped, `resolutionSchema` fails an
 * answer of the wrong shape here rather than downstream.
 *
 * The request argument is typed off the schema's *input*, so fields carrying a
 * `.default()` are optional to pass — the parse fills them.
 */
export interface ConsultationProps<
    RQ extends Consultation.Request,
    RQ_Input,
    A extends Consultation.Answer,
> {
    /** Parses the stamped request. Keeps the domain's own fields all the way through. */
    requestSchema: z.ZodType<RQ, RQ_Input>,
    /** Everything but `id` and `startedAt` — consult stamps those. */
    request:       UnstampedConsultationRequest<RQ_Input>,
    /** Validates the reply before the node sees it. */
    answerSchema:  z.ZodType<A>,
    /**
     * Runs once the waiter is armed and the request is on the session, with the stamped
     * request in hand. Anything that *invites* the answer belongs here — registering an
     * inbound route, pinging an external system — so it cannot be satisfied before there
     * is somewhere for the reply to land. Throwing unregisters the waiter rather than
     * leaving the node parked until timeout.
     */
    onOpen?:       (request: RQ) => void | Promise<void>,
}

export interface ConsultationAPI {
    consult: <
        RQ extends Consultation.Request,
        RQ_Input,
        A extends Consultation.Answer,
    >(
        props: ConsultationProps<RQ, RQ_Input, A>,
    ) => Promise<A>,
}