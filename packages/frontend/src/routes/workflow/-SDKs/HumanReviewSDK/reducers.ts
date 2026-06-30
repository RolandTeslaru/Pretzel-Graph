import type { HumanReviewSDK } from "./sdk";
import type { HumanReview } from "@pretzel-graph/shared/domain";

export const humanReviewReducers = {
    addRequest: (s, request) => {
        s.requests.set(request.id, request)
    },
    removeRequest: (s, requestId) => {
        s.requests.delete(requestId)
    },
    clearAll: (s) => {
        s.requests.clear()
    },
    // Rebuild the Map with `requestId` last → it becomes the front card. New Map ref so the
    // Object.is-subscribed overlay re-renders.
    bringToFront: (s, requestId) => {
        const entry = s.requests.get(requestId)
        if (!entry) return

        const reordered = new Map<HumanReview.Request.Id, HumanReview.Request>()
        s.requests.forEach((v, k) => { if (k !== requestId) reordered.set(k, v) })
        reordered.set(requestId, entry)
        s.requests = reordered
    },
} satisfies HumanReviewSDKReducers


interface HumanReviewSDKReducers {
    addRequest:    (state: HumanReviewSDK.State, request: HumanReview.Request) => void
    removeRequest: (state: HumanReviewSDK.State, requestId: HumanReview.Request.Id) => void
    clearAll:      (state: HumanReviewSDK.State) => void
    bringToFront:  (state: HumanReviewSDK.State, requestId: HumanReview.Request.Id) => void
}
