import type { StackSDK, StackSDKImpl } from "./sdk"
import type { DropFirstArg } from "@/SDKs/types"

export function _createStackActions_(sdk: StackSDKImpl) {

    const setState = sdk.useStore.setState;
    const reducers = sdk.reducers;

    return {
        push: (...props) => { setState(s => { reducers.push(s, ...props) }) },
        pop: (panelId) => {
            setState(s => { reducers.setIsOpen(s, panelId, false) });
            setTimeout(() => {
                setState(s => { reducers.pop(s, panelId) });
            }, sdk.EXIT_ANIMATION_MS);
        },
        popAll: () => {
            setState(s => {
                s.panels.forEach(panel => panel.isOpen = false)
            });
            setTimeout(() => {
                setState(s => { reducers.popAll(s) });
            }, sdk.EXIT_ANIMATION_MS);
        },
        bringToFront: (...props) => { setState(s => { reducers.bringToFront(s, ...props) }) },
        sendToBack: (...props) => { setState(s => { reducers.sendToBack(s, ...props) }) },
        pushCompanion: (...props) => { setState(s => { reducers.pushCompanion(s, ...props) }) },
        popCompanion: (...props) => { setState(s => { reducers.popCompanion(s, ...props) }) },
    } satisfies _StackSDKActions_
}


export interface _StackSDKActions_ {
    push: DropFirstArg<StackSDK.Reducers['push']>
    pop: (panelId: string) => void
    popAll: () => void
    bringToFront: DropFirstArg<StackSDK.Reducers['bringToFront']>
    sendToBack: DropFirstArg<StackSDK.Reducers['sendToBack']>
    pushCompanion: DropFirstArg<StackSDK.Reducers['pushCompanion']>
    popCompanion: DropFirstArg<StackSDK.Reducers['popCompanion']>
}
