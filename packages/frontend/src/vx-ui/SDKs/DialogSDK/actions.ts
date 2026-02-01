import { type DialogSDK, type DialogSDKImpl } from "./sdk"

export function createDialogSDKActions(sdk: DialogSDKImpl) {
    const setState = sdk.useStore.setState;
    return {
        pop: (dialogId) => {
            if (sdk.state.dialogs.has(dialogId) === false)
                return

            setState(s => {
                const targetDialog = s.dialogs.get(dialogId)
                if (!targetDialog)
                    return
                targetDialog.isOpen = false
            })

            setTimeout(() => {
                setState(s => {
                    s.dialogs.delete(dialogId)
                })
            }, sdk.EXIT_ANIMATION_MS)
        },
        push: (dialogId, renderer) => {
            setState(state => {
                const entry: DialogSDK.Entry = {
                    dialogId,
                    isOpen: true,
                    renderer
                }

                state.dialogs.set(dialogId, entry)
            })
        },
        popAll: () => {
            setState(s => {
                s.dialogs.forEach(dialog => dialog.isOpen = false)
            })

            setTimeout(() => {
                setState(s => {
                    s.dialogs.clear()
                })
            }, sdk.EXIT_ANIMATION_MS)
        }
    } satisfies _DialogSDKActions_
}


export type _DialogSDKActions_ = {
    push: (dialogId: string, renderer: DialogSDK.Renderer) => void,
    pop: (dialogId: string) => void,
    popAll: () => void,
}