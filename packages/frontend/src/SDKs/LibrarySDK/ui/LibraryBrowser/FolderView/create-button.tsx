import { Button, DropdownMenu } from '@pretzel-graph/standard-ui/foundations'
import type { ButtonProps } from '@pretzel-graph/standard-ui/foundations/button'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import { useLibraryBrowser } from '../root'

export const CreateBtn = ({ size }: { size?: ButtonProps['size'] }) => {
    const { cwd } = useLibraryBrowser()

    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
                <Button size={size}>
                    Create
                </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="end">
                <DropdownMenu.Item
                    onClick={() => LibrarySDK.dialogs.openCreateFolder({ parent_folder_id: cwd })}
                ><SystemIcons.Folder />Create Folder</DropdownMenu.Item>

                <DropdownMenu.Item
                    onClick={() => LibrarySDK.dialogs.openCreateWorkflow({ folder_id: cwd })}
                ><SystemIcons.Graph />Create Workflow</DropdownMenu.Item>

                <DropdownMenu.Item
                    onClick={() => LibrarySDK.dialogs.openCreateSkill({ folder_id: cwd })}
                ><SystemIcons.Sparkles2 />Create Skill</DropdownMenu.Item>
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    )
}
