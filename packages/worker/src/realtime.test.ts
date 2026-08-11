import assert from "node:assert/strict";
import test from "node:test";

import { Consultation, Execution } from "@pretzel-graph/shared/domain";
import type { Workflow } from "@pretzel-graph/shared/domain/Workflow";

import { RealtimeScopeImpl } from "./realtime";

// The three ways the old per-channel waiter broke once two things shared a channel.
// Each one used to be silent, so each is asserted directly rather than through a run.

const EXECUTION_ID = "11111111-1111-4111-8111-111111111111" as Execution.Id;
const WORKFLOW_ID  = "22222222-2222-4222-8222-222222222222" as Workflow.Id;

const CONSULTATION_A = "33333333-3333-4333-8333-333333333333" as Consultation.Id;
const CONSULTATION_B = "44444444-4444-4444-8444-444444444444" as Consultation.Id;

const SIGNAL_CHANNEL = Execution.Signal.getChannel(EXECUTION_ID);

type Published = { channel: string, payload: string };

const createScope = () => {
    const published: Published[] = [];
    let closed = false;

    const scope = new RealtimeScopeImpl(
        EXECUTION_ID,
        WORKFLOW_ID,
        (channel, payload) => { published.push({ channel, payload }); },
        () => { closed = true; },
    );

    return { scope, published, isClosed: () => closed };
};

const answerFor = (consultationId: Consultation.Id) => JSON.stringify({
    channel:        SIGNAL_CHANNEL,
    type:           "consultation:answer",
    executionId:    EXECUTION_ID,
    consultationId,
    answer:         { requestId: consultationId, variant: "test" },
});

const terminate = () => JSON.stringify({
    channel:     SIGNAL_CHANNEL,
    type:        "terminate",
    executionId: EXECUTION_ID,
});

const settled = <T>(promise: Promise<T>) => {
    let state = "pending";
    promise.then(() => { state = "resolved" }, () => { state = "rejected" });
    return () => state;
};

/** Lets any already-queued promise callbacks run before asserting on them. */
const flush = () => new Promise(resolve => setImmediate(resolve));


test("a signal for another domain leaves a parked waiter alone", async () => {
    const { scope } = createScope();

    const parked = scope.awaitSignal(
        Consultation.Signal.Answer,
        signal => signal.consultationId === CONSULTATION_A,
        60_000,
    );
    const state = settled(parked);

    scope.dispatch(terminate());
    await flush();

    // Previously: a lifecycle signal failed the consultation schema, and the rejection
    // both failed the node and tore down the subscription the real reply needed.
    assert.equal(state(), "pending");

    scope.dispatch(answerFor(CONSULTATION_A));

    const signal = await parked;
    assert.equal(signal.consultationId, CONSULTATION_A);
});


test("a same-type signal for another consultation does not resolve the waiter", async () => {
    const { scope } = createScope();

    const parked = scope.awaitSignal(
        Consultation.Signal.Answer,
        signal => signal.consultationId === CONSULTATION_A,
        60_000,
    );
    const state = settled(parked);

    scope.dispatch(answerFor(CONSULTATION_B));
    await flush();

    // Previously: the type matched, nothing compared the id, and B's answer resumed A.
    assert.equal(state(), "pending");

    scope.dispatch(answerFor(CONSULTATION_A));
    assert.equal((await parked).consultationId, CONSULTATION_A);
});


test("a matching signal resolves every waiter that matches it", async () => {
    const { scope } = createScope();

    const first  = scope.awaitSignal(Consultation.Signal.Answer, s => s.consultationId === CONSULTATION_A, 60_000);
    const second = scope.awaitSignal(Consultation.Signal.Answer, s => s.consultationId === CONSULTATION_A, 60_000);

    scope.dispatch(answerFor(CONSULTATION_A));

    assert.equal((await first).consultationId,  CONSULTATION_A);
    assert.equal((await second).consultationId, CONSULTATION_A);
});


test("onSignal receives the lifecycle union and nothing else", async () => {
    const { scope } = createScope();

    const seen: Execution.Signal["type"][] = [];
    const off = scope.onSignal(Execution.Signal.Schema, signal => { seen.push(signal.type) });

    scope.dispatch(terminate());
    scope.dispatch(answerFor(CONSULTATION_A));

    assert.deepEqual(seen, ["terminate"]);

    off();
    scope.dispatch(terminate());

    assert.deepEqual(seen, ["terminate"]);
});


test("a signal addressed to another execution is ignored", async () => {
    const { scope } = createScope();

    const parked = scope.awaitSignal(Consultation.Signal.Answer, () => true, 60_000);
    const state = settled(parked);

    scope.dispatch(JSON.stringify({
        channel:        SIGNAL_CHANNEL,
        type:           "consultation:answer",
        executionId:    "55555555-5555-4555-8555-555555555555",
        consultationId: CONSULTATION_A,
        answer:                 { requestId: CONSULTATION_A, variant: "test" },
    }));
    await flush();

    assert.equal(state(), "pending");
});


test("awaitSignalAfter registers before the action runs", async () => {
    const { scope } = createScope();

    // An action that answers instantly — the case a plain emit-then-await would lose.
    const parked = scope.awaitSignalAfter(
        Consultation.Signal.Answer,
        signal => signal.consultationId === CONSULTATION_A,
        60_000,
        () => { scope.dispatch(answerFor(CONSULTATION_A)) },
    );

    assert.equal((await parked).consultationId, CONSULTATION_A);
});


test("awaitSignalAfter unregisters when the action throws", async () => {
    const { scope } = createScope();

    const failure = new Error("register failed");

    await assert.rejects(
        scope.awaitSignalAfter(Consultation.Signal.Answer, () => true, 60_000, () => { throw failure }),
        (error: unknown) => error === failure,
    );

    // The failed park must not still be listening, or a later reply resolves a dead waiter.
    scope.dispatch(answerFor(CONSULTATION_A));
});


test("emit stamps the addressing fields from the bound execution", () => {
    const { scope, published } = createScope();

    scope.emit(Consultation.Event.create("consultation:resolved", { consultationId: CONSULTATION_A }));

    assert.equal(published.length, 1);
    assert.equal(published[0].channel, Execution.Event.getChannel(EXECUTION_ID));

    const event = JSON.parse(published[0].payload);

    assert.equal(event.type,        "consultation:resolved");
    assert.equal(event.channel,     Execution.Event.getChannel(EXECUTION_ID));
    assert.equal(event.executionId, EXECUTION_ID);
    assert.equal(event.workflowId,  WORKFLOW_ID);
});


test("close rejects whatever is still parked and unsubscribes once", async () => {
    const { scope, isClosed } = createScope();

    const parked = scope.awaitSignal(Consultation.Signal.Answer, () => true, 60_000);

    scope.close();

    await assert.rejects(parked);
    assert.ok(isClosed());

    await assert.rejects(scope.awaitSignal(Consultation.Signal.Answer, () => true, 60_000));
});


test("withAbort rejects parks bound to a signal that fires", async () => {
    const { scope } = createScope();

    const controller = new AbortController();
    const api = scope.withAbort(controller.signal);

    const parked = api.awaitSignal(Consultation.Signal.Answer, () => true, 60_000);

    controller.abort(new Error("terminated"));

    await assert.rejects(parked);

    // The abort must have cleaned the registration up, not just settled the promise.
    scope.dispatch(answerFor(CONSULTATION_A));
});
