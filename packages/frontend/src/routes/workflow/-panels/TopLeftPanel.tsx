import { WorkbenchSDK } from '@/routes/workflow/-SDKs/WorkbenchSDK/sdk'
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import { AdminPanelItem, PretzelGraphDropdown } from '@/components/PretzelGraphDropdown'
import { LibraryCwdBreadcrumbs } from '@/SDKs/LibrarySDK/ui/LibraryCwdBreadcrumbs'
import type { Library } from '@pretzel-graph/shared/domain'
import { useNavigate } from '@tanstack/react-router'

export const TopLeftPanel = () => {
    const navigate = useNavigate()
    const workflowId = WorkbenchSDK.useStore(s => s.workflowId)
    const [folder_id, display_name] = LibrarySDK.useStore(s => {
        const meta = s.workflowMetas[workflowId]
        return [meta?.folder_id, meta?.display_name] as const
    })

    return (
        <div className='fixed top-5 left-5 flex gap-3 text-sm font-medium'>
            <PretzelGraphDropdown compact>
                <AdminPanelItem />
            </PretzelGraphDropdown>
            <LibraryCwdBreadcrumbs 
                className='my-auto' 
                cwd={folder_id} 
                finalFileName={display_name}
                setCwd={(id) => navigate({ to: '/home/library/$folderId', params: { folderId: id } })}
            />
        </div>
    )
}
