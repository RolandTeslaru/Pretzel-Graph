import type { DialogSDK } from './sdk'

export interface DialogSDKSelectors {
    isDialogOpen: (state: DialogSDK.State, dialogId: string) => boolean
}

export const dialogSelectors: DialogSDKSelectors = {
    isDialogOpen: (s, dialogId) => s.dialogs.get(dialogId)?.isOpen ?? false,
}
