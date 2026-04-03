import { ShelfSDK } from '@/SDKs/ShelfSDK/sdk'
import { WorkbenchSDK } from '@/SDKs/WorkbenchSDK/sdk'
import { Button, DropdownMenu } from '@vx-agent-editor/vx-ui/foundations'
import { SystemIcons } from '@vx-agent-editor/vx-ui/icons'
import type { Workflow } from '@vx-agent-editor/shared/domain'
import React, { memo } from 'react'

interface Props {
    node: Workflow.Node
}

export const NodeCustomToolbar: React.FC<Props> = memo(({ node }) => {
    return (
        <div className='bg-card border border-border rounded-lg p-0.5 gap-1 flex flex-row shadow-md shadow-black/10'>
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
            <Button variant="ghost" size="icon-xs" className='h-6!'
                onClick={() => {
                    WorkbenchSDK.actions.node.setFlipped(node.id, !node.isFlipped)
                }}
            >
                <SystemIcons.ArrowLeftRight />
            </Button>
            <Button variant="ghost" size="icon-xs" className='text-xs'
                onClick={() => {
                    WorkbenchSDK.actions.node.setDisabled(node.id, !node.isDisabled)
                }}
            >
                <SystemIcons.Power className={`${node.isDisabled ? 'text-red-500' : ''} stroke-2`} />
            </Button>
            <Button variant="ghost-success" size="icon-xs" className='text-xs'>
                <SystemIcons.Play />
            </Button>
            <MoreOptionsDropdown node={node} />
        </div>
    )
})


const MoreOptionsDropdown: React.FC<Props> = ({ node }) => {
    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger className='p-0!' asChild >
                <Button variant="ghost" size="icon-xs" className='p-0! mt-0! ' >
                        <SystemIcons.Ellipsis />
                </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="start">
                <DropdownMenu.Item
                    onClick={() => WorkbenchSDK.actions.clipboard.copyNode(node.id)}
                >
                    <SystemIcons.Clipboard />
                    Copy
                </DropdownMenu.Item>
                <DropdownMenu.Item
                    onClick={() => WorkbenchSDK.actions.node.duplicate(node, undefined)}
                >
                    <SystemIcons.Copy />
                    Duplicate
                </DropdownMenu.Item>
                <DropdownMenu.Item
                    onClick={() => {
                        ShelfSDK.actions.hydrateBlueprint(node.blueprintId);

                        const blueprint = ShelfSDK.state.blueprints[node.blueprintId];
                        if (!blueprint) return;
                        WorkbenchSDK.actions.node.recreate(node.id, blueprint)
                    }}
                >
                    <SystemIcons.FileCode />
                    Recreate
                </DropdownMenu.Item>
                <DropdownMenu.Item variant="destructive"
                    onClick={() => WorkbenchSDK.actions.node.remove(node.id)}
                >
                    <SystemIcons.Trash2 />
                    Delete
                </DropdownMenu.Item>
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    )
}