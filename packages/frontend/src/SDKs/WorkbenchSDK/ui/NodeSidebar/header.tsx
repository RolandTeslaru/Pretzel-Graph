import { Button, DropdownMenu, Input } from '@vx-agent-editor/vx-ui/foundations'
import { LazyIcon } from '@vx-agent-editor/vx-ui/icons/LazyIcon'
import { SystemIcons } from '@vx-agent-editor/vx-ui/icons'
import { Workflow } from '@vx-agent-editor/shared/domain'
import { WorkbenchSDK } from '../../sdk'

interface HeaderProps {
    node: Workflow.Node
    isEditing: boolean
    onEditStart: () => void
    onEditFinish: () => void
}

export const NodeSidebarHeader = ({ node, isEditing, onEditStart, onEditFinish }: HeaderProps) => (
    <div className='absolute z-10 top-2 left-2 flex flex-row bg-card w-[calc(100%-16px)] p-1 rounded-full border border-border shadow-sm shadow-black/10'>
        <div
            className='flex items-center gap-2 px-3 py-1 rounded-full'
            style={{
                backgroundColor: node.accent ? `color-mix(in srgb, var(--${node.accent}) 25%, transparent)` : 'var(--muted)',
            }}
        >
            <LazyIcon
                className='my-auto h-4 w-4'
                name={node.icon as string}
                style={{ color: node.accent ? `var(--${node.accent}-foreground)` : undefined }}
            />
            {isEditing ? (
                <Input
                    className='h-6 text-sm font-semibold bg-transparent shadow-none w-fit! focus-visible:ring-0 truncate'
                    defaultValue={node.displayName}
                    autoFocus
                    onBlur={e => WorkbenchSDK.actions.node.setDisplayName(node.id, e.target.value)}
                    style={{ color: node.accent ? `var(--${node.accent}-foreground)` : undefined }}
                />
            ) : (
                <h4
                    className='text-sm font-semibold truncate'
                    style={{ color: node.accent ? `var(--${node.accent}-foreground)` : undefined }}
                >
                    {node.displayName}
                </h4>
            )}
        </div>

        {isEditing ? (
            <div className='flex flex-row gap-2 ml-auto my-auto h-auto px-1'>
                <Button size="xs" variant="success" onClick={onEditFinish}>
                    Finish
                </Button>
            </div>
        ) : (
            <div className='flex flex-row gap-2 ml-auto my-auto h-auto px-1'>
                <Button size="icon-xs" variant="ghost" onClick={() => WorkbenchSDK.actions.node.setDisabled(node.id, !node.isDisabled)}
                    className={`${node.isDisabled ? `bg-red-500/40`: ``}`}    
                >
                    <SystemIcons.Power className='stroke-2'/>
                </Button>
                <Button size="icon-xs" variant="ghost-success">
                    <SystemIcons.Play />
                </Button>
                <HeaderOptionsDropdown node={node} onEditStart={onEditStart} />
            </div>
        )}
    </div>
)

const HeaderOptionsDropdown = ({ node, onEditStart }: { node: Workflow.Node; onEditStart: () => void }) => (
    <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
            <Button size="icon-xs" variant="ghost">
                <SystemIcons.Ellipsis className='text-secondary-foreground' />
            </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="end">
            <DropdownMenu.Item onClick={onEditStart}>
                <SystemIcons.SquarePen />
                Edit
            </DropdownMenu.Item>
            <DropdownMenu.Item variant="destructive">
                <SystemIcons.Trash2 />
                Delete
            </DropdownMenu.Item>
        </DropdownMenu.Content>
    </DropdownMenu.Root>
)
