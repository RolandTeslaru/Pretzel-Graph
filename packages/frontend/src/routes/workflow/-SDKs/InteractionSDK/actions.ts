import type { InteractionSDK, InteractionSDKImpl } from "./sdk"
import type { DropFirstArg } from "@/SDKs/types"

export function _createInteractionActions_(sdk: InteractionSDKImpl) {

    const setState = sdk.useStore.setState;
    const reducers = sdk.reducers;

    return {
        push:         (...props) => { setState(s => { reducers.push(s, ...props) }) },
        pop:          (...props) => { setState(s => { reducers.pop(s, ...props) }) },
        popAll:       (...props) => { setState(s => { reducers.popAll(s, ...props) }) },
        bringToFront: (...props) => { setState(s => { reducers.bringToFront(s, ...props) }) },
    } satisfies _InteractionSDKActions_
}


export interface _InteractionSDKActions_ {
    push:         DropFirstArg<InteractionSDK.Reducers['push']>
    pop:          DropFirstArg<InteractionSDK.Reducers['pop']>
    popAll:       DropFirstArg<InteractionSDK.Reducers['popAll']>
    bringToFront: DropFirstArg<InteractionSDK.Reducers['bringToFront']>
}
