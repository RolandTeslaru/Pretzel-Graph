import "reflect-metadata";

import assert from "node:assert/strict";
import test from "node:test";

import {
    defineBlueprint,
    defineInput,
    defineOutput,
    type RuntimeNode,
} from "@pretzel-graph/node-sdk";
import { Execution, Workbench, Workflow } from "@pretzel-graph/shared/domain";
import type { Blueprint } from "@pretzel-graph/shared/domain/Foundations/Blueprint";
import type { Field } from "@pretzel-graph/shared/domain/Foundations/Field";
import type { Port } from "@pretzel-graph/shared/domain/Foundations/Port";

import { AggexExecutionError } from "../../errors";
import { S2Graph } from "../../S2/graph";
import { AggexEngine } from "../index";


const TestBlueprint = defineBlueprint({
    id: "Test.Engine.Node",
    displayName: "Engine Test Node",
    description: "Exercises the outer execution engine.",
    icon: "TestTube",
    fields: [],
    inputs: [
        defineInput.Data("input", "Input"),
        defineInput.Data("leftInput", "Left Input"),
        defineInput.Data("rightInput", "Right Input"),
    ],
    outputs: [
        defineOutput.Data("output", "Output"),
        defineOutput.Data("left", "Left"),
        defineOutput.Data("right", "Right"),
        defineOutput.Data("onError", "On Error"),
    ],
});

const WORKFLOW_ID = "workflow-test" as Workflow.Id;

const nodeId = (value: string) => value as Workflow.Node.Id;
const inputId = (value: string) => value as Port.Input.Id;
const outputId = (value: string) => value as Port.Output.Id;

type NodeFields = {
    signalDependency: "AND" | "OR" | "XOR";
    dataDependency: "AND" | "OR";
    onErrorStrategy: "terminate" | "do_nothing" | "propagate";
};

type NodeSpec = {
    id: string;
    fields?: Partial<NodeFields>;
    propagation?: RuntimeNode.PropagationStrategy;
    catchesError?: boolean;
    run?: (inputs: Record<string, unknown>) => Promise<Record<string, unknown>> | Record<string, unknown>;
    ending?: (outcome: RuntimeNode.ExecutionOutcome) => Promise<void> | void;
};

type EdgeSpec = {
    source: string;
    sourcePort: string;
    target: string;
    targetPort: string;
};

type HarnessOptions = {
    nodes: NodeSpec[];
    edges?: EdgeSpec[];
    staticValues?: Record<string, Record<string, unknown>>;
    igniter?: Execution.Igniter;
    hooks?: ConstructorParameters<typeof AggexEngine>[0]["hooks"];
};

const createHarness = (options: HarnessOptions) => {
    const events: Array<Record<string, unknown>> = [];
    const calls = new Map<string, {
        runs: Record<string, unknown>[];
        fieldEvaluations: number;
        endings: RuntimeNode.ExecutionOutcome[];
    }>();
    let destroyedProxies = 0;

    const workflowData = structuredClone(Workflow.INITIAL.data) as Workflow.Data;
    workflowData.nodes = {};
    workflowData.edges = [];
    workflowData.staticValues = {};

    for (const spec of options.nodes) {
        const id = nodeId(spec.id);
        workflowData.nodes[id] = {
            id,
            blueprintId: TestBlueprint.id,
            ui: {},
        };
        workflowData.staticValues[id] = {
            ...(options.staticValues?.[spec.id] ?? {}),
        } as never;
        calls.set(spec.id, { runs: [], fieldEvaluations: 0, endings: [] });
    }

    for (const edge of options.edges ?? [])
        workflowData.edges.push(Workflow.Edge.createId(
            nodeId(edge.source),
            outputId(edge.sourcePort),
            nodeId(edge.target),
            inputId(edge.targetPort),
        ));

    const execution: Execution = {
        id:          "execution-test" as Execution.Id,
        workflow_id: WORKFLOW_ID,
        igniter:     options.igniter ?? { variant: "workbench_manual" },
        status:      "running",
        duration:    0,
        error:       null,
        session:     Execution.Session.createInitial(),
        recording:   null,
        created_at:  new Date().toISOString(),
        updated_at:  new Date().toISOString(),
    };

    const realtimeAPI = {
        emit: (event: Record<string, unknown>) => { events.push(event) },
    };
    const realtime = {
        withAbort: () => realtimeAPI,
    };
    const airlock = {
        registerWorkflow: () => undefined,
        createScope: () => ({
            executeSync: <T>(
                _globals: Record<string, unknown>,
                body: (evaluate: (value: unknown) => unknown, setTransient: () => void) => T,
            ) => body(value => value, () => undefined),
        }),
    };
    const catalogue = {
        getNodeBlueprint: () => TestBlueprint,
    };

    const engine = new AggexEngine({
        execution,
        workflowId: WORKFLOW_ID,
        workflowData,
        airlock: airlock as never,
        credentialInstances: {},
        realtime: realtime as never,
        internalAPI: {} as never,
        catalogue: catalogue as never,
        connectionAPI: {} as never,
        hooks: options.hooks,
    });

    engine.ctx.workflowCache = Workbench.Document.createCache(workflowData, {
        [TestBlueprint.id]: TestBlueprint,
    });

    engine.ctx.compiledGraph.addVertex(S2Graph.START_VERTEX_ID);

    const targeted = new Set((options.edges ?? []).map(edge => edge.target));

    for (const spec of options.nodes) {
        const fields: NodeFields = {
            signalDependency: "OR",
            dataDependency: "AND",
            onErrorStrategy: "terminate",
            ...spec.fields,
        };
        const state = calls.get(spec.id)!;
        const instance = {
            nodeId: nodeId(spec.id),
            fieldValues: fields as unknown as Record<Field.Id, unknown>,
            CATCHES_ERROR: spec.catchesError ?? false,
            getPropagationStrategy: () => spec.propagation ?? "router",
            evaluateFieldValues: () => {
                state.fieldEvaluations += 1;
                return fields;
            },
            run: async (inputs: Record<string, unknown>) => {
                state.runs.push(inputs);
                return await spec.run?.(inputs) ?? {};
            },
            buildTool: async (inputs: Record<string, unknown>) => {
                state.runs.push(inputs);
                return await spec.run?.(inputs) ?? {};
            },
            workflowEnding: async (outcome: RuntimeNode.ExecutionOutcome) => {
                state.endings.push(outcome);
                await spec.ending?.(outcome);
            },
        } as unknown as RuntimeNode<Blueprint>;

        engine.ctx.compiledGraph.addVertex(spec.id, fields.signalDependency);
        engine.ctx.nodeRuntimeMap.set(nodeId(spec.id), {
            wfNode: workflowData.nodes[nodeId(spec.id)],
            instance,
        });

        if (!targeted.has(spec.id))
            engine.ctx.compiledGraph.addDependency(S2Graph.START_VERTEX_ID, spec.id);
    }

    for (const edge of options.edges ?? [])
        engine.ctx.compiledGraph.addDependency(edge.source, edge.target);

    const proxyAPI = engine.ctx.proxyAPI as unknown as { destroyAll(): void };
    proxyAPI.destroyAll = () => { destroyedProxies += 1 };

    return {
        engine,
        execution,
        events,
        calls,
        destroyedProxies: () => destroyedProxies,
    };
};

const deferred = () => {
    let resolve!: () => void;
    const promise = new Promise<void>(done => { resolve = done });

    return { promise, resolve };
};

const flush = () => new Promise<void>(resolve => setImmediate(resolve));


test("resolves static inputs, runs a node, and persists its projected output", async () => {
    const input = { message: "hello" };
    const output = { message: "goodbye" };
    const harness = createHarness({
        nodes: [{
            id: "node",
            run: inputs => {
                assert.strictEqual(inputs.input, input);
                return { output };
            },
        }],
        staticValues: { node: { input } },
    });

    const result = await harness.engine.run();

    assert.equal(result.status, "completed");
    assert.strictEqual(harness.execution.session.node_output_instances[nodeId("node")].output, output);
    assert.deepEqual(
        harness.execution.session.node_output_projections[nodeId("node")][outputId("output")],
        output,
    );
    assert.equal(harness.execution.session.node_status[nodeId("node")].status, "completed");
    assert.deepEqual(harness.calls.get("node")!.endings, ["completed"]);
    assert.equal(harness.destroyedProxies(), 1);
    assert.deepEqual(
        harness.events.filter(event => event.type === "node:started" || event.type === "node:completed")
            .map(event => event.type),
        ["node:started", "node:completed"],
    );
});


test("waits without evaluating fields until every wired input reaches a data-AND node", async () => {
    const slow = deferred();
    const harness = createHarness({
        nodes: [
            { id: "left", run: () => ({ output: { side: "left" } }) },
            {
                id: "right",
                run: async () => {
                    await slow.promise;
                    return { output: { side: "right" } };
                },
            },
            {
                id: "join",
                fields: { dataDependency: "AND", signalDependency: "OR" },
                run: inputs => ({ output: [inputs.leftInput, inputs.rightInput] }),
            },
        ],
        edges: [
            { source: "left", sourcePort: "output", target: "join", targetPort: "leftInput" },
            { source: "right", sourcePort: "output", target: "join", targetPort: "rightInput" },
        ],
    });

    const execution = harness.engine.run();
    await flush();

    assert.equal(harness.calls.get("join")!.runs.length, 0);
    assert.equal(harness.calls.get("join")!.fieldEvaluations, 0);
    assert.equal(harness.execution.session.node_status[nodeId("join")].status, "waiting");
    assert.equal(harness.events.filter(event => event.type === "node:waiting").length, 1);

    slow.resolve();
    await execution;

    assert.equal(harness.calls.get("join")!.runs.length, 1);
    assert.equal(harness.calls.get("join")!.fieldEvaluations, 1);
    assert.deepEqual(harness.calls.get("join")!.runs[0], {
        input: undefined,
        leftInput:  { side: "left" },
        rightInput: { side: "right" },
    });
});


test("routes a node only through output ports present in its result", async () => {
    const harness = createHarness({
        nodes: [
            { id: "router", propagation: "router", run: () => ({ left: { selected: true } }) },
            { id: "left" },
            { id: "right" },
        ],
        edges: [
            { source: "router", sourcePort: "left", target: "left", targetPort: "input" },
            { source: "router", sourcePort: "right", target: "right", targetPort: "input" },
        ],
    });

    await harness.engine.run();

    assert.equal(harness.calls.get("left")!.runs.length, 1);
    assert.deepEqual(harness.calls.get("left")!.runs[0].input, { selected: true });
    assert.equal(harness.calls.get("right")!.runs.length, 0);
    assert.equal(harness.execution.session.node_status[nodeId("right")], undefined);
});


test("records and rejects a terminating node failure", async () => {
    const failure = new Error("node exploded");
    const harness = createHarness({
        nodes: [{
            id: "failure",
            fields: { onErrorStrategy: "terminate" },
            run: () => { throw failure },
        }],
    });

    await assert.rejects(
        harness.engine.run(),
        (error: unknown) => error instanceof AggexExecutionError && error.message === failure.message,
    );

    const status = harness.execution.session.node_status[nodeId("failure")];
    assert.equal(status.status, "failed");
    assert.equal(status.error?.message, failure.message);
    assert.deepEqual(harness.calls.get("failure")!.endings, ["failed"]);
    assert.equal(harness.destroyedProxies(), 1);
});


test("keeps a swallowed failure failed while allowing the workflow to complete", async () => {
    const harness = createHarness({
        nodes: [{
            id: "failure",
            fields: { onErrorStrategy: "do_nothing" },
            run: () => { throw new Error("ignored") },
        }],
    });

    const result = await harness.engine.run();

    assert.equal(result.status, "completed");
    assert.equal(harness.execution.session.node_status[nodeId("failure")].status, "failed");
    assert.deepEqual(harness.calls.get("failure")!.endings, ["completed"]);
});


test("materializes a propagated error at a catch node without running the catch node", async () => {
    const harness = createHarness({
        nodes: [
            {
                id: "origin",
                fields: { onErrorStrategy: "propagate" },
                run: () => { throw new Error("recoverable") },
            },
            { id: "catch", catchesError: true },
            { id: "handled", run: inputs => ({ output: inputs.input }) },
        ],
        edges: [
            { source: "origin", sourcePort: "output", target: "catch", targetPort: "input" },
            { source: "catch", sourcePort: "onError", target: "handled", targetPort: "input" },
        ],
    });

    const result = await harness.engine.run();

    assert.equal(result.status, "completed");
    assert.equal(harness.execution.session.node_status[nodeId("origin")].status, "failed");
    assert.equal(harness.calls.get("catch")!.runs.length, 0);
    assert.equal(harness.execution.session.node_status[nodeId("catch")].status, "completed");
    assert.equal(
        (harness.calls.get("handled")!.runs[0].input as { message: string }).message,
        "recoverable",
    );
    assert.equal(harness.engine.ctx.errorChannel.size, 0);
});


test("pauses after active work drains and resumes exactly once", async () => {
    const work = deferred();
    let pauses = 0;
    let resumes = 0;
    let settled = false;
    const harness = createHarness({
        nodes: [{
            id: "slow",
            run: async () => {
                await work.promise;
                return {};
            },
        }],
        hooks: {
            onPause: () => { pauses += 1 },
            onResume: () => { resumes += 1 },
        },
    });

    const execution = harness.engine.run();
    void execution.then(() => { settled = true });
    await flush();

    harness.engine.pause();
    work.resolve();
    await flush();

    assert.equal(pauses, 1);
    assert.equal(settled, false);

    harness.engine.resume();
    assert.equal((await execution).status, "completed");
    assert.equal(resumes, 1);

    harness.engine.resume();
    assert.equal(resumes, 1);
});


test("stopping at the requested workbench node is a completed outcome", async () => {
    const target = nodeId("target");
    const harness = createHarness({
        nodes: [{ id: target }],
        igniter: {
            variant: "workbench_step",
            targetNodeId: target,
        },
    });

    const result = await harness.engine.run();

    assert.equal(result.status, "completed");
    assert.equal(harness.engine.ctx.abortAPI.signal.reason, AggexEngine.STOP_AT_TARGET_REASON);
    assert.equal(harness.execution.session.node_status[target].status, "completed");
    assert.deepEqual(harness.calls.get(target)!.endings, ["completed"]);
    assert.equal(harness.destroyedProxies(), 1);
});


test("termination reports a terminated outcome and runs cleanup", async () => {
    let harness!: ReturnType<typeof createHarness>;
    harness = createHarness({
        nodes: [{
            id: "active",
            run: () => new Promise((_resolve, reject) => {
                harness.engine.ctx.abortAPI.signal.addEventListener(
                    "abort",
                    () => reject(harness.engine.ctx.abortAPI.signal.reason),
                    { once: true },
                );
            }),
        }],
    });

    const execution = harness.engine.run();
    await flush();
    harness.engine.ctx.abortAPI.abort("terminated by test");

    const result = await execution;

    assert.equal(result.status, "terminated");
    assert.deepEqual(harness.calls.get("active")!.endings, ["terminated"]);
    assert.equal(harness.destroyedProxies(), 1);
});
