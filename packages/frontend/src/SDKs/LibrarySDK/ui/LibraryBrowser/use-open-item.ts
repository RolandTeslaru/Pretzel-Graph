import { useNavigate } from '@tanstack/react-router'
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'

// Opens a library item: a workflow in the editor, a skill in its editor dialog.
export function useOpenLibraryItem() {
    const navigate = useNavigate()

    return (item: LibrarySDK.Item) => {
        switch (item.type) {
            case 'workflow':
                navigate({ to: '/workflow/$workflowid', params: { workflowid: item.id } })
                break

            case 'skill':
                LibrarySDK.dialogs.openSkillEditor({ skillId: item.id })
                break

            default:
                item satisfies never
        }
    }
}
