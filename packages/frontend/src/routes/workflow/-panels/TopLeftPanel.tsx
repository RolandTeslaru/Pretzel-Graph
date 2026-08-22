import { WorkbenchSDK } from '@/routes/workflow/-SDKs/WorkbenchSDK/sdk'
import { LibrarySDK } from '@/SDKs/LibrarySDK/sdk'
import { AdminPanelItem, PretzelGraphDropdown } from '@/components/PretzelGraphDropdown'
import Breadcrumbs from '@/routes/home/library/-components/Breadcrumbs'

export const TopLeftPanel = () => {
    const workflowId = WorkbenchSDK.useStore(s => s.workflowId)
    const [folder_id, display_name] = LibrarySDK.useStore(s => {
        const meta = s.workflowMetas[workflowId]
        return [meta?.folder_id, meta?.display_name] as const
    })
    const breadCrumbs = LibrarySDK.useStore(s => {
        return LibrarySDK.selectors.getBreadcrumbs(s, folder_id);
    });

    return (
        <div className='fixed top-5 left-5 flex gap-3 text-sm font-medium'>
            <PretzelGraphDropdown compact>
                <AdminPanelItem />
            </PretzelGraphDropdown>
            <Breadcrumbs className='my-auto' cwd={breadCrumbs} finalFileName={display_name} />
        </div>
    )
}
