import type { HumanReviewSDK, HumanReviewSDKImpl } from "./sdk"
import type { DropFirstArg } from "@/SDKs/types"

export function _createHumanReviewActions_(sdk: HumanReviewSDKImpl) {

    const setState = sdk.useStore.setState;
    const reducers = sdk.reducers;

    return {
        addRequest:    (...props) => { setState(s => { reducers.addRequest(s, ...props) }) },
        removeRequest: (...props) => { setState(s => { reducers.removeRequest(s, ...props) }) },
    } satisfies _HumanReviewSDKActions_
}


export interface _HumanReviewSDKActions_ {
    addRequest:    DropFirstArg<HumanReviewSDK.Reducers['addRequest']>
    removeRequest: DropFirstArg<HumanReviewSDK.Reducers['removeRequest']>
}
