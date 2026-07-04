import { Button, Input } from '@pretzel-graph/standard-ui/foundations'
import { LazyIcon } from '@pretzel-graph/standard-ui/icons/LazyIcon'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import { Workflow } from '@pretzel-graph/shared/domain'
import { WorkbenchSDK } from '../../../sdk'
import type { NodeUI } from '../../../selectors/node'
import { ExecutionSDK } from '../../../../ExecutionSDK/sdk'
import { OptionsDropdown } from './OptionsDropdown'
import { DialogSDK } from '@/SDKs/DialogSDK'
import Tipped from '@/components/Tipped'
import FloatContainer from '@/components/FloatContainer'
import type { Blueprint } from '@pretzel-graph/shared/domain/Foundations/Blueprint'

interface HeaderProps {
    node: Workflow.Node
    ui: NodeUI
    blueprint: Blueprint
    isEditing: boolean
    onEditStart: () => void
    onEditFinish: () => void
}

export const NodeSidebarHeader = ({ node, ui, blueprint, isEditing, onEditStart, onEditFinish }: HeaderProps) => {
    const isFullscreen = DialogSDK.useStore(s => s.selectors.isDialogOpen(s, "fullscreen-node-panel"))
    return (
        <div className='absolute z-10 top-2 left-2 right-2 flex flex-row gap-2'>
            <div
                className='flex items-center gap-2 px-3 py-1 rounded-full backdrop-blur-md min-w-0 max-w-xs'
                style={{
                    backgroundColor: ui.accent ? `color-mix(in srgb, var(--${ui.accent}) 25%, transparent)` : 'var(--muted)',
                }}
            >
                <LazyIcon
                    className='my-auto h-4 w-4 shrink-0'
                    name={ui.icon}
                    style={{ color: ui.iconColor ? `var(--${ui.iconColor})` : ui.accent ? `var(--${ui.accent}-foreground)` : undefined }}
                />
                {isEditing ? (
                    <Input
                        className='h-5 text-sm font-semibold bg-transparent shadow-none w-full min-w-0 focus-visible:ring-0 truncate'
                        defaultValue={node.ui.displayName}
                        autoFocus
                        onBlur={e => WorkbenchSDK.actions.node.setDisplayName(node.id, e.target.value)}
                        style={{ color: ui.accent ? `var(--${ui.accent}-foreground)` : undefined }}
                    />
                ) : (
                    <h4
                        className='text-sm font-semibold truncate min-w-0'
                        style={{ color: ui.accent ? `var(--${ui.accent}-foreground)` : undefined }}
                    >
                        {node.ui.displayName}
                    </h4>
                )}
            </div>
            <FloatContainer className='ml-auto backdrop-blur-md'>
                {isEditing ? (
                    <div className='flex flex-row gap-2 ml-auto my-auto h-auto'>
                        <Button size="xs" className='rounded-full' variant="success" onClick={onEditFinish}>
                            Finish
                        </Button>
                    </div>
                ) : (
                    <div className='flex flex-row gap-2'>
                        <Tipped label="Run up to here">
                            <Button size="icon-xs" variant="ghost-success" onClick={() => ExecutionSDK.actions.runStep(node.id)}>
                                <SystemIcons.Play />
                            </Button>
                        </Tipped>
                        <Tipped label={node.isDisabled ? "Enable" : "Disable"}>
                            <Button size="icon-xs" variant="ghost" onClick={() => WorkbenchSDK.actions.node.setDisabled(node.id, !node.isDisabled)}
                                className={`${node.isDisabled ? `bg-red-500/40` : ``}`}
                            >
                                <SystemIcons.Power className='stroke-2' />
                            </Button>
                        </Tipped>
                        {isFullscreen ? (
                            <Tipped label="Collapse">
                                <Button size="icon-xs" variant="ghost" onClick={() => WorkbenchSDK.actions.ui.closeNodePanelFullscreen()}>
                                    <SystemIcons.Minimize />
                                </Button>
                            </Tipped>
                        ) : (
                            <Tipped label="Expand">
                                <Button size="icon-xs" variant="ghost" onClick={() => WorkbenchSDK.actions.ui.openNodePanelFullscreen()}>
                                    <SystemIcons.Maximize2 />
                                </Button>
                            </Tipped>
                        )}
                        <OptionsDropdown node={node} blueprint={blueprint} onEdit={onEditStart} />
                    </div>
                )}
            </FloatContainer>
        </div>
    )
}


