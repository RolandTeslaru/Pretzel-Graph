import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import { ContextMenu } from '@pretzel-graph/standard-ui/foundations'
import type { Library } from '@pretzel-graph/shared/domain'
import { NewSubMenu } from './folder'

interface Props {
    cwd: Library.Folder.Id
}

export function BackgroundMenuItems({ cwd }: Props) {
    const showHidden = LibrarySDK.useStore((s) => s.showHidden)

    return (
        <>
            <NewSubMenu folderId={cwd} />
            <ContextMenu.Separator />
            <ContextMenu.CheckboxItem
                checked={showHidden}
                onCheckedChange={(checked) => LibrarySDK.actions.preferences.setShowHidden(checked)}
            >
                Show hidden
            </ContextMenu.CheckboxItem>
        </>
    )
}
