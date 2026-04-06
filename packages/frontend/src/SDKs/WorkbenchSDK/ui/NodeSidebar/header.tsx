import { Button, DropdownMenu, Input } from '@vx-agent-editor/vx-ui/foundations'
import { LazyIcon } from '@vx-agent-editor/vx-ui/icons/LazyIcon'
import { SystemIcons } from '@vx-agent-editor/vx-ui/icons'
import { Workflow } from '@vx-agent-editor/shared/domain'
import { WorkbenchSDK } from '../../sdk'
import { ExecutionSessionSDK } from '@/SDKs/ExecutionSessionSDK/sdk'
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
        <>
            <div className='absolute z-10 top-2 left-2 flex flex-row gap-2'>
                <div
                    className='flex items-center gap-2 px-3 py-1 rounded-full backdrop-blur-md'
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
                <div className='h-auto my-auto'>
                    <StatusIndicator nodeId={node.id} executionStatus={nodeStatus} />
                </div>
            </div>
            <div className='absolute z-10 top-2 right-2 flex flex-row bg-card w-fit p-0.5 rounded-xl border border-border shadow-sm shadow-black/10'>

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
        </>
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
            <DropdownMenu.Item variant="destructive">
                <SystemIcons.Trash2 />
                Delete
            </DropdownMenu.Item>
        </DropdownMenu.Content>
    </DropdownMenu.Root>
)
