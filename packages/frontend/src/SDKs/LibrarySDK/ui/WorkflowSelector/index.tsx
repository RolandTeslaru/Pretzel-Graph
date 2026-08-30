import { useState } from 'react'
import { Dialog, SearchInput } from '@pretzel-graph/standard-ui/foundations'
import { Library, Workflow } from '@pretzel-graph/shared/domain'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { DialogSDK } from '@pretzel-graph/standard-ui/SDKs/DialogSDK'
import { QuerySDK } from '@pretzel-graph/standard-ui/SDKs/QuerySDK/sdk'
import { VersionControlSDK } from '@/SDKs/VersionControlSDK'
import { LibraryTree } from '@/SDKs/LibrarySDK/ui/LibraryBrowser/LibraryTree'
import { FolderView } from '@/SDKs/LibrarySDK/ui/LibraryBrowser/FolderView'
import Breadcrumbs from '@/routes/home/library/-components/Breadcrumbs'

export const WORKFLOW_SELECTOR_DIALOG_ID = "workflow-selector"

export const openWorkflowSelector = (onWorkflowSelected: (workflowId: Workflow.Id) => void) => {
    DialogSDK.actions.push(WORKFLOW_SELECTOR_DIALOG_ID, (props) => (
        <WorkflowSelector dialogProps={props} onWorkflowSelected={onWorkflowSelected} />
    ))
}

interface Props {
    dialogProps: DialogSDK.TemplateProps
    onWorkflowSelected: (workflowId: Workflow.Id) => void
}

const WorkflowSelector = ({ dialogProps, onWorkflowSelected }: Props) => {
    const [cwd, setCwd] = useState<Library.Folder.Id>(Library.Folder.ROOT_ID)

    const [treeSearchQuery, setTreeSearchQuery] = useState("")
    const [viewSearchQuery, setViewSearchQuery] = useState("")

    const query = QuerySDK.useQuery(
        ['version-control', 'active-workflows'],
        () => VersionControlSDK.actions.listActiveWorkflows(),
        { staleTime: 60_000 },
    )

    const handleSelect = (workflowId: Workflow.Id) => {
        onWorkflowSelected(workflowId)
        DialogSDK.actions.pop(WORKFLOW_SELECTOR_DIALOG_ID)
    }

    return (
        <DialogSDK.SplitTemplate {...dialogProps}
            sidebarRenderer={() => (
                <div className='relative'>
                    <div className='absolute flex flex-col gap-2 top-0 left-0 px-2 py-2 z-20 w-full'>
                        <Dialog.Title className='text-sm px-2'>Select a Workflow</Dialog.Title>
                        <SearchInput size='xs'
                            className='rounded-full!'
                            onSearch={(value) => setTreeSearchQuery(value)}
                        />
                    </div>

                    <div className='flex-1 min-h-0'>
                        <LibraryTree
                            size="sm"
                            cwd={cwd}
                            setCwd={setCwd}
                            searchQuery={treeSearchQuery}
                            onWorkflowClick={handleSelect}
                            className='pt-[70px] px-2'
                            scrollContainerClassName='h-[600px] [mask-image:linear-gradient(to_bottom,transparent_8px,black_80px)]'
                        />
                    </div>
                </div>
            )}
            sidebarClassName='w-[260px] shrink-0 p-0!'
            contentClassName='p-0!'
        >
            <div className='flex h-full w-[480px] shrink-0 flex-col gap-2 relative'>
                <div className='absolute z-20 px-2 w-full top-2 flex flex-row justify-between'>
                    <Breadcrumbs className='h-auto my-auto' linkClassName='text-xs!' cwd={cwd} setCwd={setCwd}/>
                    <SearchInput className='rounded-full!' size="xs" onSearch={value => setViewSearchQuery(value)}/>
                </div>
                <div className='flex-1 min-h-0'>
                    <FolderView
                        size="sm"
                        cwd={cwd}
                        setCwd={setCwd}
                        searchQuery={viewSearchQuery}
                        onWorkflowClick={handleSelect}
                        className='pt-[40px] px-2'
                        scrollContainerClassName='h-[600px] [mask-image:linear-gradient(to_bottom,transparent_8px,black_50px)]'
                    />
                </div>
            </div>
        </DialogSDK.SplitTemplate>
    )
}
