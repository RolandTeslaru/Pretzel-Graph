import { Library } from '@pretzel-graph/shared/domain'
import type { Workflow } from '@pretzel-graph/shared/domain'
import { Button, DropdownMenu, ScrollArea } from '@pretzel-graph/standard-ui/foundations'
import React, { useState } from 'react'
import { FileSystemTree } from '../FileSystemTree'
import FolderView from '../FolderView'
import { LibrarySDK } from '../../sdk'

interface Props {
    selectedWorkflowId?: Workflow.Id,
    selectWorkflow: (id: Workflow.Id) => void
    triggerClassName?: string
    children?: React.ReactNode
}

const WorkflowPicker: React.FC<Props> = ({ selectWorkflow, selectedWorkflowId, triggerClassName, children }) => {

    const [open, setOpen] = useState(false)

    const [cwd, setCwd] = useState<Library.Folder.Id>(Library.Folder.ROOT_ID)

    const [childFolders, childWorkflows] = LibrarySDK.useStore(s => [
        Object.values(s.folders).filter((f) => f.parent_folder_id === cwd),
        Object.values(s.workflowMetas).filter((w) => w.folder_id === cwd)
    ])

    const handleWorkflowClick = (id: Workflow.Id) => {
        selectWorkflow(id)
        setOpen(false)
    }

    const selectedWorkflowMeta = LibrarySDK.useStore(s => selectedWorkflowId && s.workflowMetas[selectedWorkflowId]) 

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
        <DropdownMenu.Trigger className={triggerClassName}>
            {children ? children :
                <Button variant="input">
                    {selectedWorkflowMeta ? 
                        selectedWorkflowMeta.display_name
                        :
                        "Select a Workflow"
                    }
                </Button>
            }
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="start" className='max-h-[400px] w-[600px] p-0! flex flex-row'>
            <ScrollArea.Root className='max-w-[200px] min-w-[200px] px-1'>
                <FileSystemTree size="sm" cwd={cwd}
                    selectedWorkflowId={selectedWorkflowId}
                    onFolderClick={(id) => setCwd(id)}
                    onWorkflowClick={handleWorkflowClick}
                />
            </ScrollArea.Root>
            <ScrollArea.Root className='w-full pt-2'>
                <FolderView
                    childFolders={childFolders}
                    workflows={childWorkflows}
                    className='px-1'
                    size='sm'
                    onFolderClick={(id) => setCwd(id)}
                    onWorkflowClick={handleWorkflowClick}
                />
            </ScrollArea.Root>
        </DropdownMenu.Content>
    </DropdownMenu.Root>
  )
}

export default WorkflowPicker