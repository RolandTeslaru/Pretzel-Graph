import { Button, DropdownMenu } from '@pretzel-graph/standard-ui/foundations'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { Workflow } from '@pretzel-graph/shared/domain'
import { WorkbenchSDK } from '../../../sdk'

export const OptionsDropdown = ({ node, onEdit }: { node: Workflow.Node; onEdit: () => void }) => (
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
            <DropdownMenu.Item onClick={() => { WorkbenchSDK.actions.node.recreate(node.id) }}>
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
