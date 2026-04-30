import { ShelfSDK } from '@/routes/workflow/-SDKs/ShelfSDK/sdk'
import { WorkbenchSDK } from '@/routes/workflow/-SDKs/WorkbenchSDK/sdk'
import { Button, DropdownMenu } from '@pretzel-graph/standard-ui/foundations'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import type { Workflow } from '@pretzel-graph/shared/domain'
import React from 'react'

interface Props {
    node: Workflow.Node
}

export const OptionsDropdown: React.FC<Props> = ({ node }) => (
    <DropdownMenu.Root>
        <DropdownMenu.Trigger className='p-0!' asChild>
            <Button variant="ghost" size="icon-xs" className='p-0! mt-0!'>
                <SystemIcons.Ellipsis />
            </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="start">
            <DropdownMenu.Item onClick={() => WorkbenchSDK.actions.node.setDisabled(node.id, !node.isDisabled)}>
                <SystemIcons.Power />
                {node.isDisabled ? 'Enable' : 'Disable'}
            </DropdownMenu.Item>
            <DropdownMenu.Separator />
            <DropdownMenu.Item onClick={() => WorkbenchSDK.actions.clipboard.copyNode(node.id)}>
                <SystemIcons.Clipboard />
                Copy
            </DropdownMenu.Item>
            <DropdownMenu.Item onClick={() => WorkbenchSDK.actions.node.duplicate(node, undefined)}>
                <SystemIcons.Copy />
                Duplicate
            </DropdownMenu.Item>
            <DropdownMenu.Item
                onClick={() => {
                    ShelfSDK.actions.hydrateBlueprint(node.blueprintId);
                    WorkbenchSDK.actions.node.recreate(node.id)
                }}
            >
                <SystemIcons.Undo />
                Recreate
            </DropdownMenu.Item>
            <DropdownMenu.Separator />
            <DropdownMenu.Item onClick={() => navigator.clipboard.writeText(node.id)}>
                <SystemIcons.Copy />
                Copy Node ID
            </DropdownMenu.Item>
            <DropdownMenu.Item onClick={() => navigator.clipboard.writeText(node.blueprintId)}>
                <SystemIcons.Copy />
                Copy Blueprint ID
            </DropdownMenu.Item>
            <DropdownMenu.Separator />
            <DropdownMenu.Item variant="destructive" onClick={() => WorkbenchSDK.actions.node.remove(node.id)}>
                <SystemIcons.Trash2 />
                Delete
            </DropdownMenu.Item>
        </DropdownMenu.Content>
    </DropdownMenu.Root>
)
