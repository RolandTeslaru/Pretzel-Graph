import type { Execution } from "@pretzel-graph/shared/domain";
import type { ExecutionSDK, ExecutionSDKImpl } from "./sdk";
import { toast } from "sonner";

// Streaming events arrive as individual WebSocket messages, so React can't batch
// across them — each setState was its own commit, and a single node firing emits
// 3-5 events (node:started, unit:started, node:completed, unit:completed,
// relation:createBatch). That packed 3-5 TimelineViewer renders into one frame.
// We throttle: queue events and flush them in ONE setState per THROTTLE_MS window.
// Terminal/end-state events flush immediately so the final state never feels laggy.
const THROTTLE_MS = 120;

const TERMINAL = new Set<Execution.Event["type"]>([
    "completed",
    "failed",
    "terminated",
    "recording:completed",
    "recording:fullyUploaded",
]);

let queue: Execution.Event[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let lastFlush = 0;

// Applies an event's state mutation to the draft and  returns a deferred side-effect
// (toast / action call) to run AFTER the batched setState, in arrival order — or null.
const reduceEvent = (
    sdk: ExecutionSDKImpl,
    s: ExecutionSDK.State,
    e: Execution.Event,
): (() => void) | null => {
    const r = sdk.reducers.currentExecution;
    switch (e.type) {
        // Lifecycle
        case "started":
            r.setStatus(s, "running");
            return null;
        case "completed":
            r.setSession(s, e.session);
            r.setStatus(s, "completed");
            return () => sdk.actions.removeAwaitedConfirmation("started");
        case "failed":
            r.setSession(s, e.session);
            r.setStatus(s, "failed");
            r.setError(s, e.error);
            return () => {
                sdk.actions.removeAwaitedConfirmation("started");
                toast.error(`Execution failed: ${e.error.message}`);
            };
        case "terminated":
            r.setStatus(s, "terminated");
            return () => sdk.actions.removeAwaitedConfirmation("terminated");
        case "paused":
            r.setSession(s, e.session);
            r.setStatus(s, "paused");
            return null;
        case "resumed":
            r.setSession(s, e.session);
            r.setStatus(s, "running");
            return null;
        case "suspended":
            r.setSession(s, e.session);
            r.setStatus(s, "suspended");
            return null;

        // Session updates
        case "node:started":
        case "node:completed":
        case "node:waiting":
        case "node:error":
        case "update":
            r.applySessionUpdate(s, e.sessionUpdate);
            return null;

        // Recording
        case "unit:started":
            r.recording.unit.patchStarted(s, e.unit);
            return null;
        case "unit:completed":
            r.recording.unit.patchCompleted(s, e);
            return null;
        case "unit:failed":
            r.recording.unit.patchFailed(s, e);
            return null;
        case "relation:createBatch":
            r.recording.relation.patchCreateBatch(s, e);
            return null;
        case "recording:completed":
            // s.isCurrentExecutionRecording = false;
            return null;
        case "recording:fullyUploaded":
            // No state mutation — purely loads the finalized recording.
            return () => sdk.actions.loadLiveRecording(e.executionId);

        default:
            return () => toast.error(`Received unknown event: ${(e as Execution.Event).type}`);
    }
};

const flush = (sdk: ExecutionSDKImpl) => {
    if (timer) {
        clearTimeout(timer);
        timer = null;
    }
    lastFlush = performance.now();
    if (queue.length === 0) return;

    const batch = queue;
    queue = [];

    const effects: Array<() => void> = [];
    sdk.setState(s => {
        for (const e of batch) {
            const fx = reduceEvent(sdk, s, e);
            if (fx) effects.push(fx);
        }
        // Layout is maintained incrementally per-event; recompute scale + sizes
        // once for the whole batch (they depend on durations/totalDuration).
        sdk.reducers.timeline.recompute(s);
    });
    for (const fx of effects) fx();
};

export const handleExecutionEvents = (sdk: ExecutionSDKImpl, e: Execution.Event) => {
    queue.push(e);

    // End-states flush right away — no point delaying the final render.
    if (TERMINAL.has(e.type)) {
        flush(sdk);
        return;
    }

    // Already scheduled — this event rides the pending flush.
    if (timer) return;

    // Throttle: at most one flush per THROTTLE_MS. The trailing timer also drains
    // the queue once the stream goes quiet, so nothing is stranded.
    const wait = Math.max(0, THROTTLE_MS - (performance.now() - lastFlush));
    timer = setTimeout(() => flush(sdk), wait);
};
