import { WorkbenchSDK } from '@/SDKs/WorkbenchSDK/sdk'
import { Button, DropdownMenu } from '@/vx-ui/foundations'
import { SystemIcons } from '@/vx-ui/icons'
import type { Workflow } from '@vx-agent-editor/shared/domain'
import React from 'react'

interface Props {
    node: Workflow.Node
}

export const NodeCustomToolbar: React.FC<Props> = ({ node }) => {
    return (
        <div className='bg-card border border-border rounded-lg p-0.5 gap-1 flex flex-row'>
            <Button variant="ghost" size="icon-xs" className='h-6!'
                onClick={() => {
                    WorkbenchSDK.actions.node.setMinimized(node.id, !node.isMinimized)
                }}
            >
                {node.isMinimized ?
                    <SystemIcons.Maximize2 />
                    :
                    <SystemIcons.Minimize2 />
                }
            </Button>
            <Button variant="success" size="xs" className='text-xs'>Simulate</Button>
            <MoreOptionsDropdown node={node} />
        </div>
    )
}


const MoreOptionsDropdown: React.FC<Props> = ({ node }) => {
    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger className='p-0! max-h-[24px]'>
                <Button variant="ghost" size="icon-xs" className='p-0! mt-0! max-h-[24px]!'  >
                    <SystemIcons.Ellipsis />
                </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="start">
                <DropdownMenu.Item>
                    <SystemIcons.Clipboard />
                    Copy
                </DropdownMenu.Item>
                <DropdownMenu.Item>
                    <SystemIcons.Copy />
                    Duplicate
                </DropdownMenu.Item>
                <DropdownMenu.Item variant="destructive">
                    <SystemIcons.Trash2 />
                    Delete
                </DropdownMenu.Item>
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    )
}