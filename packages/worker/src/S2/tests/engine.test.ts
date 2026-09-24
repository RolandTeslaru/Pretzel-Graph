import assert from "node:assert/strict";
import test from "node:test";

import { S2Engine } from "../engine";
import { S2EngineError, S2EngineShortCircuitError, S2EngineXORCollisionError } from "../errors";
import { S2Graph, Vertex } from "../graph";
import type { S2Hooks } from "../types";


const id = (value: string) => value as Vertex.Id;

const createGraph = (
    vertices: Array<string | [string, Vertex.STRATEGY]>,
    dependencies: Array<[string, string]>,
) => {
    const graph = new S2Graph();

    graph.addVertex(S2Graph.START_VERTEX_ID);

    for (const vertex of vertices) {
        if (typeof vertex === "string")
            graph.addVertex(vertex);
        else
            graph.addVertex(vertex[0], vertex[1]);
    }

    for (const [source, target] of dependencies)
        graph.addDependency(source, target);

    return graph;
};

const createHooks = (overrides: Partial<S2Hooks> = {}): S2Hooks => ({
    onVertexExecute: async () => undefined,
    onVertexWaiting: () => undefined,
    onVertexFired: () => undefined,
    onVertexCompleted: () => undefined,
    onVertexError: () => undefined,
    canVertexRun: () => true,
    ...overrides,
});

const deferred = () => {
    let resolve!: () => void;
    const promise = new Promise<void>(done => { resolve = done });

    return { promise, resolve };
};

const flush = () => new Promise<void>(resolve => setImmediate(resolve));


test("executes a linear graph in dependency order", async () => {
    const graph = createGraph(
        ["first", "second"],
        [[S2Graph.START_VERTEX_ID, "first"], ["first", "second"]],
    );
    const executed: Vertex.Id[] = [];

    const result = await new S2Engine().ignite(graph, createHooks({
        onVertexExecute: async vertexId => {
            executed.push(vertexId);
        },
    }));

    assert.equal(result, "completed");
    assert.deepEqual(executed, [S2Graph.START_VERTEX_ID, id("first"), id("second")]);
});


test("an AND vertex waits for every dependency and receives the complete signal set", async () => {
    const graph = createGraph(
        ["fast", "slow", ["join", "AND"]],
        [
            [S2Graph.START_VERTEX_ID, "fast"],
            [S2Graph.START_VERTEX_ID, "slow"],
            ["fast", "join"],
            ["slow", "join"],
        ],
    );
    const slow = deferred();
    const joinSignals: Vertex.Id[][] = [];
    const waits: Array<{ signals: Vertex.Id[], total: number }> = [];

    const execution = new S2Engine().ignite(graph, createHooks({
        onVertexExecute: async (vertexId, signals) => {
            if (vertexId === id("slow"))
                await slow.promise;

            if (vertexId === id("join"))
                joinSignals.push([...signals].sort());
        },
        onVertexWaiting: (vertexId, signals, _resolution, total) => {
            if (vertexId === id("join"))
                waits.push({ signals: [...signals], total });
        },
    }));

    await flush();

    assert.deepEqual(joinSignals, []);
    assert.deepEqual(waits, [{ signals: [id("fast")], total: 2 }]);

    slow.resolve();
    await execution;

    assert.deepEqual(joinSignals, [[id("fast"), id("slow")]]);
});


test("an OR vertex fires independently for signals that arrive at different times", async () => {
    const graph = createGraph(
        ["fast", "slow", ["join", "OR"]],
        [
            [S2Graph.START_VERTEX_ID, "fast"],
            [S2Graph.START_VERTEX_ID, "slow"],
            ["fast", "join"],
            ["slow", "join"],
        ],
    );
    const slow = deferred();
    const joinSignals: Vertex.Id[][] = [];

    const execution = new S2Engine().ignite(graph, createHooks({
        onVertexExecute: async (vertexId, signals) => {
            if (vertexId === id("slow"))
                await slow.promise;

            if (vertexId === id("join"))
                joinSignals.push([...signals]);
        },
    }));

    await flush();
    assert.deepEqual(joinSignals, [[id("fast")]]);

    slow.resolve();
    await execution;

    assert.deepEqual(joinSignals, [[id("fast")], [id("slow")]]);
});


test("a returned signal set routes execution to only the selected dependents", async () => {
    const graph = createGraph(
        ["router", "selected", "skipped"],
        [
            [S2Graph.START_VERTEX_ID, "router"],
            ["router", "selected"],
            ["router", "skipped"],
        ],
    );
    const executed: Vertex.Id[] = [];

    await new S2Engine().ignite(graph, createHooks({
        onVertexExecute: async vertexId => {
            executed.push(vertexId);

            if (vertexId === id("router"))
                return new Set([id("selected")]);
        },
    }));

    assert.ok(executed.includes(id("selected")));
    assert.ok(!executed.includes(id("skipped")));
});


test("an XOR vertex rejects when two signals collide in the same scheduling turn", async () => {
    const graph = createGraph(
        ["left", "right", ["exclusive", "XOR"]],
        [["left", "exclusive"], ["right", "exclusive"]],
    );
    const engine = new S2Engine();
    const execution = engine.ignite(graph, createHooks());

    engine.overrides.addSignal(id("exclusive"), id("left"));
    engine.overrides.addSignal(id("exclusive"), id("right"));

    await assert.rejects(execution, S2EngineXORCollisionError);
});


test("does not settle while parallel vertex executions are still active", async () => {
    const graph = createGraph(
        ["left", "right"],
        [[S2Graph.START_VERTEX_ID, "left"], [S2Graph.START_VERTEX_ID, "right"]],
    );
    const left = deferred();
    const right = deferred();
    let settled = false;

    const execution = new S2Engine().ignite(graph, createHooks({
        onVertexExecute: async vertexId => {
            if (vertexId === id("left"))
                await left.promise;
            if (vertexId === id("right"))
                await right.promise;
        },
    }));
    void execution.then(() => { settled = true });

    await flush();
    left.resolve();
    await flush();
    assert.equal(settled, false);

    right.resolve();
    assert.equal(await execution, "completed");
    assert.equal(settled, true);
});


test("rejects execution errors and reports the failing vertex", async () => {
    const graph = createGraph(
        ["failure"],
        [[S2Graph.START_VERTEX_ID, "failure"]],
    );
    const failure = new Error("node failed");
    const errors: Array<{ vertexId: Vertex.Id, error: unknown }> = [];

    const execution = new S2Engine().ignite(graph, createHooks({
        onVertexExecute: async vertexId => {
            if (vertexId === id("failure"))
                throw failure;
        },
        onVertexError: (vertexId, error) => { errors.push({ vertexId, error }) },
    }));

    await assert.rejects(execution, error => error === failure);
    assert.deepEqual(errors, [{ vertexId: id("failure"), error: failure }]);
});


test("turns an error from a scheduled waiting hook into an execution rejection", async () => {
    const graph = createGraph(
        ["arrived", "missing", ["join", "AND"]],
        [
            [S2Graph.START_VERTEX_ID, "arrived"],
            ["arrived", "join"],
            ["missing", "join"],
        ],
    );
    const failure = new Error("waiting hook failed");
    const errors: Array<{ vertexId: Vertex.Id, error: unknown }> = [];

    const execution = new S2Engine().ignite(graph, createHooks({
        onVertexWaiting: vertexId => {
            if (vertexId === id("join"))
                throw failure;
        },
        onVertexError: (vertexId, error) => { errors.push({ vertexId, error }) },
    }));

    await assert.rejects(execution, error => error === failure);
    assert.deepEqual(errors, [{ vertexId: id("join"), error: failure }]);
});


test("short-circuits a rapidly repeating cycle", async () => {
    const graph = createGraph(
        [["loop", "OR"]],
        [[S2Graph.START_VERTEX_ID, "loop"], ["loop", "loop"]],
    );
    const errors: Array<{ vertexId: Vertex.Id, error: unknown }> = [];

    const execution = new S2Engine().ignite(graph, createHooks({
        onVertexError: (vertexId, error) => { errors.push({ vertexId, error }) },
    }));

    await assert.rejects(execution, S2EngineShortCircuitError);
    assert.equal(errors.length, 1);
    assert.equal(errors[0].vertexId, id("loop"));
    assert.ok(errors[0].error instanceof S2EngineShortCircuitError);
});


test("rejects a graph without the start vertex", async () => {
    const graph = new S2Graph();
    graph.addVertex("orphan");

    await assert.rejects(
        new S2Engine().ignite(graph, createHooks()),
        (error: unknown) => error instanceof S2EngineError && error.message.includes("__START__"),
    );
});
