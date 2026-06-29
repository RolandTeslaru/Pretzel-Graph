import type { HumanReviewSDK } from "./sdk";
import type { HumanReview } from "@pretzel-graph/shared/domain";

export const humanReviewReducers = {
    addRequest: (s, request) => {
        s.requests[request.id] = request
    },
    removeRequest: (s, requestId) => {
        delete s.requests[requestId]
    },
} satisfies HumanReviewSDKReducers


interface HumanReviewSDKReducers {
    addRequest:    (state: HumanReviewSDK.State, request: HumanReview.Request) => void
    removeRequest: (state: HumanReviewSDK.State, requestId: HumanReview.Request.Id) => void
}
