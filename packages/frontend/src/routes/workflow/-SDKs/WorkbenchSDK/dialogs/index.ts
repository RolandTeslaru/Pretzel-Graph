import { openAddInputPortDialog } from './add-input-port-dialog'
import { openEditInputPortDialog } from './edit-input-port-dialog'
import { openCreateSubWorkflowDialog } from './create-sub-workflow-dialog'
import { openDependencyUpdaterDialog } from './dependency-updater-dialog'

export function _createWorkbenchDialogs_() {
    return {
        openAddInputPort:      openAddInputPortDialog,
        openEditInputPort:     openEditInputPortDialog,
        openCreateSubWorkflow: openCreateSubWorkflowDialog,
        openDependencyUpdater: openDependencyUpdaterDialog,
    }
}

export type _WorkbenchSDKDialogs = ReturnType<typeof _createWorkbenchDialogs_>
