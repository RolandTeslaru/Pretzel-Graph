import { openAddInputPortDialog } from './add-input-port-dialog'
import { openCreateSubWorkflowDialog } from './create-sub-workflow-dialog'

export function _createWorkbenchDialogs_() {
    return {
        openAddInputPort:      openAddInputPortDialog,
        openCreateSubWorkflow: openCreateSubWorkflowDialog,
    }
}

export type _WorkbenchSDKDialogs = ReturnType<typeof _createWorkbenchDialogs_>
