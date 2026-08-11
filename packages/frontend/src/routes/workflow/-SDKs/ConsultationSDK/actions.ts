import type { ConsultationSDK, ConsultationSDKImpl } from "./sdk"
import type { DropFirstArg } from "@/SDKs/types"

export function _createConsultationActions_(sdk: ConsultationSDKImpl) {

    const setState = sdk.useStore.setState;
    const reducers = sdk.reducers;

    return {
        reconcile:    (...props) => { setState(s => { reducers.reconcile(s, ...props) }) },
        remove:       (...props) => { setState(s => { reducers.remove(s, ...props) }) },
        clear:        (...props) => { setState(s => { reducers.clear(s, ...props) }) },
        bringToFront: (...props) => { setState(s => { reducers.bringToFront(s, ...props) }) },
    } satisfies _ConsultationSDKActions_
}


export interface _ConsultationSDKActions_ {
    reconcile:    DropFirstArg<ConsultationSDK.Reducers['reconcile']>
    remove:       DropFirstArg<ConsultationSDK.Reducers['remove']>
    clear:        DropFirstArg<ConsultationSDK.Reducers['clear']>
    bringToFront: DropFirstArg<ConsultationSDK.Reducers['bringToFront']>
}
