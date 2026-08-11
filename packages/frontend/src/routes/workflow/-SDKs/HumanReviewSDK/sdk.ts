import { BaseSDK } from "@/SDKs/Base";
import { SDK } from "@/SDKs/SDKManager";
import { createWithEqualityFn } from "zustand/traditional";
import { immer } from "zustand/middleware/immer";
import { shallow } from "zustand/shallow";
import { enableMapSet } from "immer";
import { HumanReview, Execution } from "@pretzel-graph/shared/domain";
import { RealtimeSDK } from "@/SDKs/Realtime/sdk";
import { ExecutionSDK } from "../ExecutionSDK/sdk";
import { _createHumanReviewActions_, type _HumanReviewSDKActions_ } from "./actions";
import { humanReviewReducers } from "./reducers";

enableMapSet()

@SDK("HumanReview")
export class HumanReviewSDKImpl extends BaseSDK<HumanReviewSDK.State> {

    constructor() { super() }

    // Insertion order = stack order; the LAST request is the front card.
    public readonly useStore: BaseSDK.Store<HumanReviewSDK.State> = createWithEqualityFn(
        immer<HumanReviewSDK.State>(() => ({
            requests: new Map(),
        })),
        shallow,
    )

    public readonly reducers: HumanReviewSDK.Reducers = humanReviewReducers;
    public readonly actions: HumanReviewSDK.Actions = _createHumanReviewActions_(this);
    public readonly selectors = {};

    public readonly runtime = {
        unsubscribeFromEvents: null as (() => void) | null,
        subscribedExecutionId:  null as Execution.Id | null,
    }

    public subscribeToEvents(executionId: Execution.Id) {
        if (this.runtime.subscribedExecutionId === executionId) return;

        this.runtime.unsubscribeFromEvents?.();
        this.runtime.subscribedExecutionId = executionId;

        this.runtime.unsubscribeFromEvents = RealtimeSDK.subscribeToChannel<HumanReview.Event.Schema>(
            HumanReview.Event.getChannel(executionId),
            this.handleOnEvent,
        )
    }

    public unsubscribeFromEvents() {
        this.runtime.unsubscribeFromEvents?.();
        this.runtime.unsubscribeFromEvents = null;
        this.runtime.subscribedExecutionId = null;
    }

    public handleOnEvent = (event: HumanReview.Event.Schema) => {
        switch (event.type) {
            case "human-review:sent":
                this.actions.addRequest(event.request);
                break;
            case "human-review:resolved":
                // Delete is enough — AnimatePresence keeps the card mounted to play its exit.
                this.actions.removeRequest(event.requestId);
                break;
        }
    }
}

export const HumanReviewSDK = SDK.get<HumanReviewSDKImpl>("HumanReview")


// // Bind the review subscription to the execution currently in view. Owned here (not in
// // ExecutionSDK) so the dependency points feature → core, never the reverse.
// ExecutionSDK.observeCurrent({
//     onDetach: () => {
//         HumanReviewSDK.unsubscribeFromEvents();
//         HumanReviewSDK.actions.clearAll();
//     },
//     // A historical (already-settled) execution can never receive requests — start clean.
//     onAttach: (execution, { isLive }) => {
//         if (!isLive)
//             HumanReviewSDK.actions.clearAll();

//         HumanReviewSDK.subscribeToEvents(execution.id);
//     },

//     // The run left the live set, so drop any requests still parked in the UI.
//     onStop: () => HumanReviewSDK.actions.clearAll(),

// }, { immediate: true })


export namespace HumanReviewSDK {
    export type State = {
        requests: Map<HumanReview.Request.Id, HumanReview.Request>
    }

    export type Reducers = typeof humanReviewReducers
    export type Actions = _HumanReviewSDKActions_
}
