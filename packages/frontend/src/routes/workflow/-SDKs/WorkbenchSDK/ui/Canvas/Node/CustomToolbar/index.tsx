import { ShelfSDK } from '@/routes/workflow/-SDKs/ShelfSDK/sdk'
import { WorkbenchSDK } from '@/routes/workflow/-SDKs/WorkbenchSDK/sdk'
import { Button, DropdownMenu } from '@pretzel-graph/vx-ui/foundations'
import { SystemIcons } from '@pretzel-graph/vx-ui/icons'
import type { Workflow } from '@pretzel-graph/shared/domain'
import React, { memo } from 'react'
import type { Field } from '@pretzel-graph/shared/domain/Foundations/Field'
import { router } from '@/main'

interface Props {
    node: Workflow.Node
}

export const NodeCustomToolbar: React.FC<Props> = memo(({ node }) => {

    const isSubWorkflowNode = node.blueprintId === "Core.SubWorkflow.Execute"

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
            {isSubWorkflowNode && (
                <Button variant="ghost-active" size="icon-xs" className='h-6!'
                    onClick={() => {
                        const state = WorkbenchSDK.state;
                        const workflowId =WorkbenchSDK.selectors.field.getValue(state, node.id, "workflowId" as Field.Id) as Workflow.Id | null
                        const href = router.buildLocation({ to: "/workflow/$workflowid", params: { workflowid: workflowId || ""  } }).href;
                        window.open(href, "_blank");
                    }}
                >
                    <SystemIcons.Graph/>
                </Button>
            )}
            <Button variant="ghost-success" size="icon-xs" className='text-xs'>
                <SystemIcons.Play />
            </Button>
            {node.toolCompatible && (
                <ToolButton node={node} />
            )}
            <MoreOptionsDropdown node={node} />
        </div>
    )
})


const ToolButton: React.FC<Props> = memo(({ node }) => {
    const isTool = WorkbenchSDK.useStore(s => WorkbenchSDK.selectors.node.isTool(s, node.id));

    return (
        <Button variant="ghost" size="icon-xs" className={`h-6! ${isTool ? 'bg-(--port-Tool)/20 text-(--port-Tool) ' : ''}`}
            onClick={() => {
                if (isTool) WorkbenchSDK.actions.tool.revert(node.id);
                else WorkbenchSDK.actions.tool.convert(node.id);
            }}
        >
            <SystemIcons.Hammer />
        </Button>
    );
});

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
                    onClick={() => WorkbenchSDK.actions.node.setDisabled(node.id, !node.isDisabled)}
                >
                    <SystemIcons.Power />
                    {node.isDisabled ? 'Enable' : 'Disable'}
                </DropdownMenu.Item>
                <DropdownMenu.Separator />
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