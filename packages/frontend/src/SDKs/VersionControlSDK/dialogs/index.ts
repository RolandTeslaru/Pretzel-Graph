import { openPublishDialog } from "./publish-dialog"
import { openDeployDialog, openUndeployDialog, openDeletePublicationDialog } from "./publication-dialogs"

export function _createVersionControlDialogs_() {
    return {
        openPublish:           openPublishDialog,
        openDeploy:            openDeployDialog,
        openUndeploy:          openUndeployDialog,
        openDeletePublication: openDeletePublicationDialog,
    }
}

export type _VersionControlSDKDialogs = ReturnType<typeof _createVersionControlDialogs_>
