import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { ContextMenu } from '@pretzel-graph/standard-ui/foundations'
import type { Skill } from '@pretzel-graph/shared/domain'
import { toast } from 'sonner'

interface Props {
    skill: Skill.Meta
}

export function SkillMenuItems({ skill }: Props) {
    return (
        <>
            <ContextMenu.Item
                icon={<SystemIcons.SquarePen className='size-4' />}
                onClick={() => LibrarySDK.dialogs.openSkillEditor({ skillId: skill.id })}
            >
                Edit
            </ContextMenu.Item>
            <ContextMenu.Item
                icon={<SystemIcons.Copy className='size-4' />}
                onClick={() => copy(skill.id, 'Skill id copied')}
            >
                Copy ID
            </ContextMenu.Item>
            <ContextMenu.Item
                icon={<SystemIcons.ArrowRight className='size-4' />}
                onClick={() => openMoveSkill(skill)}
            >
                Move to…
            </ContextMenu.Item>
            <ContextMenu.Separator />
            <ContextMenu.Item
                variant='destructive'
                icon={<SystemIcons.Trash2 className='size-4' />}
                onClick={() => LibrarySDK.dialogs.openDeleteSkill(skill)}
            >
                Delete
            </ContextMenu.Item>
        </>
    )
}

function openMoveSkill(skill: Skill.Meta) {
    LibrarySDK.dialogs.openLibrarySelector({
        accept: 'folder',
        onSelect: async ({ id }) => {
            if (id === skill.folder_id) return

            await LibrarySDK.actions.skill.move(skill.id, id)
            toast.success('Skill moved')
        },
    })
}

async function copy(text: string, message: string) {
    await navigator.clipboard.writeText(text)
    toast.success(message)
}
