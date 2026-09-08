import { openCreateFolderDialog, openEditFolderDialog, openDeleteFolderDialog } from './folder-dialogs'
import { openCreateWorkflowDialog, openEditWorkflowDialog, openDeleteWorkflowDialog } from './workflow-dialogs'
import { openListPublicWorkflowDialog, openUnlistPublicWorkflowDialog, openListingManagerDialog } from './listing-dialogs'
import { openDependencySelectorDialog } from './DependencySelectorDialog'
import { openResourceSelector } from './ResourceSelector'

export function _createLibraryDialogs_() {
    return {
        openCreateFolder:         openCreateFolderDialog,
        openEditFolder:           openEditFolderDialog,
        openDeleteFolder:         openDeleteFolderDialog,
        openCreateWorkflow:       openCreateWorkflowDialog,
        openEditWorkflow:         openEditWorkflowDialog,
        openDeleteWorkflow:       openDeleteWorkflowDialog,
        openListPublicWorkflow:   openListPublicWorkflowDialog,
        openUnlistPublicWorkflow: openUnlistPublicWorkflowDialog,
        openListingManager:       openListingManagerDialog,
        openDependencySelector:   openDependencySelectorDialog,
        openResourceSelector:     openResourceSelector,
    }
}

export type _LibrarySDKDialogs = ReturnType<typeof _createLibraryDialogs_>
