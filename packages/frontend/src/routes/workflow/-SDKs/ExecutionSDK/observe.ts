import type { Execution } from "@pretzel-graph/shared/domain";
import type { ExecutionSDKImpl } from "./sdk";

const LIVE     = new Set<Execution.Status>(["pending", "running", "paused", "suspended"]);
const TERMINAL = new Set<Execution.Status>(["completed", "failed", "terminated"]);

export const isLiveStatus = (status: Execution.Status) => LIVE.has(status)

/**
 * Identity callbacks (onAttach/onDetach) track WHICH execution is in view.
 * Status callbacks track one execution moving through its states, and fire only
 * while identity is stable — an A→B swap emits detach+attach and nothing else.
 */
export type CurrentExecutionObserver = {
    /** A different execution came into view — bind channels here. `isLive` is false for history. */
    onAttach?: (execution: Execution, meta: { previous?: Execution, isLive: boolean }) => void
    /** The attached execution left view, swapped out or cleared — tear down here. */
    onDetach?: (execution: Execution, meta: { reason: "swapped" | "cleared" }) => void

    /** Any status change. Fires first, before the specific edge below. */
    onStatusChange?: (execution: Execution, from: Execution.Status) => void
    /** Entered `running` from anything but `paused` — the run began. */
    onStart?:        (execution: Execution) => void
    /** Entered `paused`. */
    onPause?:        (execution: Execution) => void
    /** `paused` → `running`. Leaving `paused` any other way fires onStop instead. */
    onResume?:       (execution: Execution) => void
    /** Entered `suspended` — parked on external input, still live. */
    onSuspend?:      (execution: Execution) => void
    /** Left the live set (pending/running/paused/suspended) — the run is no longer going. */
    onStop?:         (execution: Execution, from: Execution.Status) => void
    /** Reached any terminal status. Fires alongside onComplete/onFail/onTerminate. */
    onSettle?:       (execution: Execution) => void
    /** Entered `completed`. */
    onComplete?:     (execution: Execution) => void
    /** Entered `failed` — read `execution.error` for the cause. */
    onFail?:         (execution: Execution) => void
    /** Entered `terminated` — killed by the user or the worker. */
    onTerminate?:    (execution: Execution) => void
}

export type ObserveOptions = {
    /** Replay onAttach for whatever is already in state at registration. */
    immediate?: boolean
}

type Transition = [next: Execution | undefined, prev: Execution | undefined]

export function observeCurrentExecution(
    sdk:      ExecutionSDKImpl,
    observer: CurrentExecutionObserver,
    opts:     ObserveOptions = {},
): () => void {

    let disposed = false;
    let draining = false;

    const queue: Transition[] = [];

    const emit = (next?: Execution, prev?: Execution) => {

        if (next?.id !== prev?.id) {
            if (prev)
                observer.onDetach?.(prev, { reason: next ? "swapped" : "cleared" });

            if (next)
                observer.onAttach?.(next, { previous: prev, isLive: LIVE.has(next.status) });

            return;
        }

        if (!next || !prev)
            return;

        const to   = next.status;
        const from = prev.status;

        if (to === from)
            return;

        observer.onStatusChange?.(next, from);

        if (LIVE.has(from) && !LIVE.has(to))
            observer.onStop?.(next, from);

        if (to === "running" && from === "paused")
            observer.onResume?.(next);
        else if (to === "running")
            observer.onStart?.(next);
        else if (to === "paused")
            observer.onPause?.(next);
        else if (to === "suspended")
            observer.onSuspend?.(next);

        if (!TERMINAL.has(to))
            return;

        observer.onSettle?.(next);

        if (to === "completed")
            observer.onComplete?.(next);

        if (to === "failed")
            observer.onFail?.(next);

        if (to === "terminated")
            observer.onTerminate?.(next);
    }

    // A callback that writes to ExecutionSDK re-enters here synchronously. Queue the
    // nested transition instead of nesting the emit, so handlers always see edges in
    // the order they happened rather than inside-out.
    const schedule = (next?: Execution, prev?: Execution) => {

        if (disposed)
            return;

        queue.push([next, prev]);

        if (draining)
            return;

        draining = true;

        try {
            while (queue.length > 0 && !disposed) {
                const [n, p] = queue.shift()!;
                emit(n, p);
            }
        }
        finally {
            draining = false;
            queue.length = 0;
        }
    }

    const unsubscribe = sdk.subscribe((state, prev) => {
        schedule(state.currentExecution, prev.currentExecution);
    })

    if (opts.immediate && sdk.state.currentExecution)
        schedule(sdk.state.currentExecution, undefined);

    return () => {
        disposed = true;
        queue.length = 0;
        unsubscribe();
    }
}
