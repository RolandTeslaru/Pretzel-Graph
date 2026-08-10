import type { HumanReviewSDK, HumanReviewSDKImpl } from "./sdk"
import type { DropFirstArg } from "@/SDKs/types"
import { HumanReview } from "@pretzel-graph/shared/domain"
import { api } from "@/SDKs/ApiInterceptorSDK"
import { toast } from "sonner"
import { InteractionSDK } from "../InteractionSDK"
import { reviewCardRenderer } from "./ui/ReviewCard/renderer"

export function _createHumanReviewActions_(sdk: HumanReviewSDKImpl) {

    const setState = sdk.useStore.setState;
    const reducers = sdk.reducers;

    return {
        // Request data is owned here; the card is pushed into the shared interaction stack
        // under the same id so the two stay addressable together.
        addRequest: (request) => {
            setState(s => { reducers.addRequest(s, request) });
            InteractionSDK.actions.push(request.id, reviewCardRenderer(request));
        },

        removeRequest: (requestId) => {
            InteractionSDK.actions.pop(requestId);
            setState(s => { reducers.removeRequest(s, requestId) });
        },

        // Pops only this feature's cards — other features share the stack.
        clearAll: () => {
            sdk.state.requests.forEach(request => InteractionSDK.actions.pop(request.id));
            setState(s => { reducers.clearAll(s) });
        },

        // User → engine. Posts the resolution; the route returns once the worker has consumed it,
        // so on success we drop the request here (Event.Resolved would otherwise be the fallback).
        respond: async (requestId, resolution) => {
            const request = sdk.state.requests.get(requestId);

            if (!request) return false;

            try {
                const { success } = await HumanReview.API.humanResponded(api, {
                    executionId: request.executionId,
                    requestId,
                    resolution,
                });

                if (success)
                    sdk.actions.removeRequest(requestId);
                else
                    toast.error("Response was not consumed by the engine");

                return success;
            } catch {
                toast.error("Failed to submit response");
                return false;
            }
        },
    } satisfies _HumanReviewSDKActions_
}


export interface _HumanReviewSDKActions_ {
    addRequest:    DropFirstArg<HumanReviewSDK.Reducers['addRequest']>
    removeRequest: DropFirstArg<HumanReviewSDK.Reducers['removeRequest']>
    clearAll:      DropFirstArg<HumanReviewSDK.Reducers['clearAll']>
    respond:       (requestId: HumanReview.Request.Id, resolution: HumanReview.Resolution) => Promise<boolean>
}
