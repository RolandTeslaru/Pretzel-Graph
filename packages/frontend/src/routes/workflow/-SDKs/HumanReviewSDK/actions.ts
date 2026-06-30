import type { HumanReviewSDK, HumanReviewSDKImpl } from "./sdk"
import type { DropFirstArg } from "@/SDKs/types"
import { HumanReview } from "@pretzel-graph/shared/domain"
import { api } from "@/SDKs/ApiInterceptorSDK"
import { toast } from "sonner"

export function _createHumanReviewActions_(sdk: HumanReviewSDKImpl) {

    const setState = sdk.useStore.setState;
    const reducers = sdk.reducers;

    // User → engine. Posts the resolution; the route returns once the worker has consumed it,
    // so on success we drop the request here (Event.Resolved would otherwise be the fallback).
    const respond = async (requestId: HumanReview.Request.Id, resolution: HumanReview.Resolution): Promise<boolean> => {
        const request = sdk.state.requests.get(requestId);
        if (!request) return false;

        try {
            const { success } = await HumanReview.API.humanResponded(api, {
                executionId: request.executionId,
                requestId,
                resolution,
            });
            if (success) 
                setState(s => { reducers.removeRequest(s, requestId) });
            else 
                toast.error("Response was not consumed by the engine");
            return success;
        } catch {
            toast.error("Failed to submit response");
            return false;
        }
    }

    return {
        addRequest:    (...props) => { setState(s => { reducers.addRequest(s, ...props) }) },
        removeRequest: (...props) => { setState(s => { reducers.removeRequest(s, ...props) }) },
        clearAll:      (...props) => { setState(s => { reducers.clearAll(s, ...props) }) },
        bringToFront:  (...props) => { setState(s => { reducers.bringToFront(s, ...props) }) },
        respond,
    } satisfies _HumanReviewSDKActions_
}


export interface _HumanReviewSDKActions_ {
    addRequest:    DropFirstArg<HumanReviewSDK.Reducers['addRequest']>
    removeRequest: DropFirstArg<HumanReviewSDK.Reducers['removeRequest']>
    clearAll:      DropFirstArg<HumanReviewSDK.Reducers['clearAll']>
    bringToFront:  DropFirstArg<HumanReviewSDK.Reducers['bringToFront']>
    respond:       (requestId: HumanReview.Request.Id, resolution: HumanReview.Resolution) => Promise<boolean>
}
