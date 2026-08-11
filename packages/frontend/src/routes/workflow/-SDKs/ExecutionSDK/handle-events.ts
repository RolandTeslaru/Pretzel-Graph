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

const TERMINAL = new Set<string>([
    "lifecycle:completed",
    "lifecycle:failed",
    "lifecycle:terminated",
    "recording:completed",
    "recording:fullyUploaded",
]);

// Queue state lives on sdk.runtime.events, not this module, so detaching from an
// execution can drop its pending flush instead of applying it to the next one.

// Applies an event's state mutation to the draft. Anything that isn't a draft write —
// a toast, an async fetch — is returned as a thunk to run AFTER the batched setState,
// in arrival order; cases with nothing to defer just break. Nothing here may touch `s`
// once produce returns, so the thunks close over `sdk` and `e` only.
const reduceEvent = (
    sdk:   ExecutionSDKImpl,
    s:     ExecutionSDK.State,
    event: Execution.Event.Base,
): (() => void) | undefined => {
    const r = sdk.reducers.currentExecution;

    // The channel is Base-typed so new domains don't have to be threaded through here.
    // This SDK narrows to its own union; everything else belongs to a listener.
    const e = event as Execution.Event;

    switch (e.type) {
        // Lifecycle
        case "lifecycle:started":
            r.setStatus(s, "running");
            break;
        case "lifecycle:completed":
            r.session.set(s, e.session);
            r.setStatus(s, "completed");
            sdk.reducers.awaitedConfirmation.remove(s, "started");
            break;
        case "lifecycle:failed":
            r.session.set(s, e.session);
            r.setStatus(s, "failed");
            r.setError(s, e.error);
            sdk.reducers.awaitedConfirmation.remove(s, "started");
            return () => toast.error(`Execution failed: ${e.error.message}`);
        case "lifecycle:terminated":
            r.setStatus(s, "terminated");
            sdk.reducers.awaitedConfirmation.remove(s, "terminated");
            break;
        case "lifecycle:paused":
            r.session.set(s, e.session);
            r.setStatus(s, "paused");
            break;
        case "lifecycle:resumed":
            r.session.set(s, e.session);
            r.setStatus(s, "running");
            break;
        case "lifecycle:suspended":
            r.session.set(s, e.session);
            r.setStatus(s, "suspended");
            break;

        // Session updates
        case "node:started":
        case "node:completed":
        case "node:waiting":
        case "node:error":
        case "session:patch":
            r.session.applyPatch(s, e.sessionPatch);
            break;

        // Recording
        case "unit:started":
            r.recording.unit.patchStarted(s, e.unit);
            break;
        case "unit:completed":
            r.recording.unit.patchCompleted(s, e);
            break;
        case "unit:failed":
            r.recording.unit.patchFailed(s, e);
            break;
        case "relation:createBatch":
            r.recording.relation.patchCreateBatch(s, e);
            break;
        case "recording:completed":
            // s.isCurrentExecutionRecording = false;
            break;
        case "recording:fullyUploaded":
            // No state mutation — purely loads the finalized recording.
            return () => sdk.actions.loadLiveRecording(e.executionId);

        // Not ours — another domain handles it through subscribeToEvents. Unrecognised
        // types are visible in RealtimeSDK's message log rather than flagged here, since
        // this SDK has no way to know which types other domains have claimed.
        default:
            break;
    }
};

// Hands every listener the whole batch, in arrival order. Runs after this SDK has
// committed and before its effects, so other domains' state lands first — see the phase
// note on flush. Iterates a copy so a listener that subscribes or unsubscribes mid-
// dispatch doesn't mutate the set we're walking.
const dispatchToListeners = (sdk: ExecutionSDKImpl, batch: Execution.Event.Base[]) => {
    const { listeners } = sdk.runtime.events;

    if (listeners.size === 0) return;

    for (const listener of [...listeners]) {
        try {
            listener(batch);
        }
        catch (err) {
            console.error("ExecutionSDK: event listener threw", err);
        }
    }
};

const flush = (sdk: ExecutionSDKImpl) => {
    const rt = sdk.runtime.events;

    if (rt.timer) {
        clearTimeout(rt.timer);
        rt.timer = null;
    }

    rt.lastFlush = performance.now();

    if (rt.queue.length === 0) return;

    const batch = rt.queue;
    rt.queue = [];

    const effects: Array<() => void> = [];
    sdk.setState(s => {
        for (const e of batch) {
            const fx = reduceEvent(sdk, s, e);
            if (fx) effects.push(fx);
        }
        // Layout is maintained incrementally per-event; recompute scale + sizes
        // once for the whole batch (they depend on durations/totalDuration), and
        // only if something in it actually moved a unit.
        if (s.isTimelineGeometryDirty)
            sdk.reducers.timeline.recompute(s);
    });

    // Three phases, in order: our state (above), other domains' state, then all
    // side effects. React batches the commits from the first two into one render.
    dispatchToListeners(sdk, batch);

    for (const fx of effects) fx();
};

export const handleExecutionEvents = (sdk: ExecutionSDKImpl, e: Execution.Event.Base) => {
    const rt = sdk.runtime.events;

    rt.queue.push(e);

    // End-states flush right away — no point delaying the final render.
    if (TERMINAL.has(e.type)) {
        flush(sdk);
        return;
    }

    // Already scheduled — this event rides the pending flush.
    if (rt.timer) return;

    // Throttle: at most one flush per THROTTLE_MS. The trailing timer also drains
    // the queue once the stream goes quiet, so nothing is stranded.
    const wait = Math.max(0, THROTTLE_MS - (performance.now() - rt.lastFlush));

    rt.timer = setTimeout(() => flush(sdk), wait);
};

/**
 * Drops whatever is queued for the execution being detached. Without this a pending
 * flush would apply the old run's events to whichever execution is current when it fires.
 */
export const discardQueuedEvents = (sdk: ExecutionSDKImpl) => {
    const rt = sdk.runtime.events;

    if (rt.timer) {
        clearTimeout(rt.timer);
        rt.timer = null;
    }

    rt.queue     = [];
    rt.lastFlush = 0;
};
