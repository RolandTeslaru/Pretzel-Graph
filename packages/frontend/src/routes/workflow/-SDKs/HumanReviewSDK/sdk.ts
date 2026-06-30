import { BaseSDK } from "@/SDKs/Base";
import { SDK } from "@/SDKs/SDKManager";
import { createWithEqualityFn } from "zustand/traditional";
import { immer } from "zustand/middleware/immer";
import { shallow } from "zustand/shallow";
import { enableMapSet } from "immer";
import { HumanReview, Execution, Workflow } from "@pretzel-graph/shared/domain";
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


// // ─── DUMMY DATA (remove) — seeds the stack so RequestStacker can be eyeballed ──────────────
// function createDummyRequests(): HumanReviewSDK.State["requests"] {
//     const base = (n: number) => ({
//         nodeId:      `node-${n}` as Workflow.Node.Id,
//         executionId: "dummy-exec" as Execution.Id,
//         createdAt:   Date.now() - (5 - n) * 1000,   // staggered so order is visible
//         timeoutMs:   60_000,
//     })

//     const requests: HumanReview.Request[] = [
//         // { id: "dummy-1" as HumanReview.Request.Id, ...base(1), title: "Deploy to production?", message: "The agent wants to deploy build #4821.", variant: "confirm", approveLabel: "Deploy", rejectLabel: "Cancel" },
//         // { id: "dummy-2" as HumanReview.Request.Id, ...base(1), title: "Approve Tool usage?", message: "The agent wants to deploy build #4821.", variant: "confirm", approveLabel: "Deploy", rejectLabel: "Cancel" },
//         { id: "dummy-2" as HumanReview.Request.Id, ...base(2), title: "Pick an environment", message: "Where should this run?", variant: "choice", options: [{ label: "Staging", value: "staging" }, { label: "Production", value: "prod" }, { label: "Endtime", value: "das" }, { label: "sup", value: "sup"}, { label: "dasdas", value: "dasddd" }], multiple: true, allowCustom: true },
//         // { id: "dummy-3" as HumanReview.Request.Id, ...base(3), title: "Refund details", message: "Confirm the refund amount and reason.", variant: "form", fields: [] },
//         // { id: "dummy-4" as HumanReview.Request.Id, ...base(4), title: "Approve the summary?", message: "Review the generated report before sending.", variant: "confirm", approveLabel: "Send", rejectLabel: "Discard" },
//     ]

//     return new Map(requests.map(r => [r.id, r]))
// }


// Bind the review subscription to the execution currently in view. Owned here (not in
// ExecutionSDK) so the dependency points feature → core, never the reverse.
ExecutionSDK.subscribe((state, prev) => {
    if (state.currentExecution?.id === prev.currentExecution?.id)
        return

    if (!state.currentExecution) {
        HumanReviewSDK.runtime.unsubscribeFromEvents?.();
        HumanReviewSDK.runtime.unsubscribeFromEvents = null;
        HumanReviewSDK.runtime.subscribedExecutionId = null;
        return
    }

    HumanReviewSDK.subscribeToEvents(state.currentExecution.id)
})


export namespace HumanReviewSDK {
    export type State = {
        requests: Map<HumanReview.Request.Id, HumanReview.Request>
    }

    export type Reducers = typeof humanReviewReducers
    export type Actions = _HumanReviewSDKActions_
}
