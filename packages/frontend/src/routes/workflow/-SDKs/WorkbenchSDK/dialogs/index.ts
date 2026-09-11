import { openAddInputPortDialog } from './add-input-port-dialog'

export function _createWorkbenchDialogs_() {
    return {
        openAddInputPort: openAddInputPortDialog,
    }
}

export type _WorkbenchSDKDialogs = ReturnType<typeof _createWorkbenchDialogs_>
