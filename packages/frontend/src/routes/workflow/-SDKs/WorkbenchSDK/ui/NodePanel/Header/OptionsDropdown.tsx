import { Button, DropdownMenu } from '@pretzel-graph/standard-ui/foundations'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { Workflow } from '@pretzel-graph/shared/domain'
import { WorkbenchSDK } from '../../../sdk'
import type { Blueprint } from '@pretzel-graph/shared/domain/Foundations/Blueprint'

interface Props {
    hyNode: Workflow.HydratedNode
    onEdit: () => void
}

export const OptionsDropdown = ({ hyNode, onEdit }: Props) => {
    const isTool = WorkbenchSDK.useStore(s => s.selectors.node.isTool(s, hyNode.id));

    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
                <Button size="icon-xs" variant="ghost">
                    <SystemIcons.Ellipsis className='text-secondary-foreground' />
                </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="end" sideOffset={6}>
                <DropdownMenu.Item onClick={onEdit}>
                    <SystemIcons.SquarePen />
                    Edit
                </DropdownMenu.Item>
                <DropdownMenu.Item onClick={() => { WorkbenchSDK.actions.node.recreate(hyNode.id) }}>
                    <SystemIcons.Undo />
                    Recreate
                </DropdownMenu.Item>
                {hyNode.dependency && (
                    <DropdownMenu.Item onClick={() => WorkbenchSDK.openWorkflowWindow(hyNode.dependency!.workflowId)}>
                        <SystemIcons.Graph />
                        Open workflow
                    </DropdownMenu.Item>
                )}
                {hyNode.blueprint.toolCompatible && (
                    <DropdownMenu.Item onClick={() => isTool ? WorkbenchSDK.actions.tool.revert(hyNode.id) : WorkbenchSDK.actions.tool.convert(hyNode.id)}>
                        <SystemIcons.Hammer />
                        {isTool ? "Revert to node" : "Convert to tool"}
                    </DropdownMenu.Item>
                )}
                <DropdownMenu.Separator />
                <DropdownMenu.Item onClick={() => navigator.clipboard.writeText(hyNode.id)}>
                    <SystemIcons.Copy />
                    Copy Node ID
                </DropdownMenu.Item>
                <DropdownMenu.Item onClick={() => navigator.clipboard.writeText(hyNode.blueprintId)}>
                    <SystemIcons.Copy />
                    Copy Blueprint ID
                </DropdownMenu.Item>
                <DropdownMenu.Separator />
                <DropdownMenu.Item variant="destructive" onClick={() => WorkbenchSDK.actions.node.remove(hyNode.id)}>
                    <SystemIcons.Trash2 />
                    Delete
                </DropdownMenu.Item>
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    )
}
