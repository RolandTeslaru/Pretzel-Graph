import { useNavigate } from '@tanstack/react-router'
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import { GatewaySDK } from '@/SDKs/GatewaySDK/sdk'

// Opens a library item: a workflow in the editor, a skill or connection in its dialog.
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

            case 'connection': {
                const connection = GatewaySDK.state.connections[item.id]

                if (connection)
                    LibrarySDK.dialogs.openEditConnection({ connection })

                break
            }

            default:
                item satisfies never
        }
    }
}
