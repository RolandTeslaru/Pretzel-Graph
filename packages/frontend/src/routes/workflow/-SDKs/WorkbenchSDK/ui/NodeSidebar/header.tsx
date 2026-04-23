import { Button, DropdownMenu, Input } from '@pretzel-graph/standard-ui/foundations'
import { LazyIcon } from '@pretzel-graph/standard-ui/icons/LazyIcon'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { Workflow } from '@pretzel-graph/shared/domain'
import { WorkbenchSDK } from '../../sdk'
import { ShelfSDK } from '@/routes/workflow/-SDKs/ShelfSDK/sdk'
import { ExecutionSessionSDK } from '@/routes/workflow/-SDKs/ExecutionSessionSDK/sdk'
import StatusIndicator from '../Canvas/Node/Header/StatusIndicator'

interface HeaderProps {
    node: Workflow.Node
    isEditing: boolean
    onEditStart: () => void
    onEditFinish: () => void
}

export const NodeSidebarHeader = ({ node, isEditing, onEditStart, onEditFinish }: HeaderProps) => {

    const nodeStatus = ExecutionSessionSDK.useStore(s => {
        return s.session.node_status[node.id]
    });

    return (
        <div className='absolute z-10 top-2 left-2 right-2 flex flex-row gap-2'>
            <div
                className='flex items-center gap-2 px-3 py-1 rounded-full backdrop-blur-md min-w-0 max-w-xs'
                style={{
                    backgroundColor: node.accent ? `color-mix(in srgb, var(--${node.accent}) 25%, transparent)` : 'var(--muted)',
                }}
            >
                <LazyIcon
                    className='my-auto h-4 w-4 shrink-0'
                    name={node.icon as string}
                    style={{ color: node.accent ? `var(--${node.accent}-foreground)` : undefined }}
                />
                {isEditing ? (
                    <Input
                        className='h-5 text-sm font-semibold bg-transparent shadow-none w-full min-w-0 focus-visible:ring-0 truncate'
                        defaultValue={node.displayName}
                        autoFocus
                        onBlur={e => WorkbenchSDK.actions.node.setDisplayName(node.id, e.target.value)}
                        style={{ color: node.accent ? `var(--${node.accent}-foreground)` : undefined }}
                    />
                ) : (
                    <h4
                        className='text-sm font-semibold truncate min-w-0'
                        style={{ color: node.accent ? `var(--${node.accent}-foreground)` : undefined }}
                    >
                        {node.displayName}
                    </h4>
                )}
            </div>

            <StatusIndicator nodeId={node.id} executionStatus={nodeStatus} className='mb-0 mt-auto'/>
                        
            <div className='ml-auto z-10 flex flex-row bg-card-float w-fit p-0.5 rounded-xl border border-border shadow-md shadow-black/10'>

                {isEditing ? (
                    <div className='flex flex-row gap-2 ml-auto my-auto h-auto'>
                        <Button size="xs" className='rounded-full' variant="success" onClick={onEditFinish}>
                            Finish
                        </Button>
                    </div>
                ) : (
                    <div className='flex flex-row gap-2 ml-auto my-auto h-auto'>
                        <Button size="icon-xs" variant="ghost" onClick={onEditStart}>
                            <SystemIcons.SquarePen />
                        </Button>
                        <Button size="icon-xs" variant="ghost" onClick={() => WorkbenchSDK.actions.node.setDisabled(node.id, !node.isDisabled)}
                            className={`${node.isDisabled ? `bg-red-500/40` : ``}`}
                        >
                            <SystemIcons.Power className='stroke-2' />
                        </Button>
                        <Button size="icon-xs" variant="ghost-success">
                            <SystemIcons.Play />
                        </Button>
                        <HeaderOptionsDropdown node={node} />
                    </div>
                )}
            </div>
        </div>
    )
}
const HeaderOptionsDropdown = ({ node }: { node: Workflow.Node }) => (
    <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
            <Button size="icon-xs" variant="ghost">
                <SystemIcons.Ellipsis className='text-secondary-foreground' />
            </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="end">
            <DropdownMenu.Item
                onClick={() => {
                    ShelfSDK.actions.hydrateBlueprint(node.blueprintId)
                    const blueprint = ShelfSDK.state.blueprints[node.blueprintId]
                    if (!blueprint) return
                    WorkbenchSDK.actions.node.recreate(node.id, blueprint)
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
