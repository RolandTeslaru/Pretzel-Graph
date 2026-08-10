import type { HumanReviewSDK } from "./sdk";
import type { HumanReview } from "@pretzel-graph/shared/domain";

// Data only — stack order and card presentation live in InteractionSDK.
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
} satisfies HumanReviewSDKReducers


interface HumanReviewSDKReducers {
    addRequest:    (state: HumanReviewSDK.State, request: HumanReview.Request) => void
    removeRequest: (state: HumanReviewSDK.State, requestId: HumanReview.Request.Id) => void
    clearAll:      (state: HumanReviewSDK.State) => void
}
