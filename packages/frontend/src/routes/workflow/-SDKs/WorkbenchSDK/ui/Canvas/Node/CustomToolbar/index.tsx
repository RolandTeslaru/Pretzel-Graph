import { WorkbenchSDK } from '@/routes/workflow/-SDKs/WorkbenchSDK/sdk'
import { Button } from '@pretzel-graph/standard-ui/foundations'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import type { Workflow } from '@pretzel-graph/shared/domain'
import React, { memo } from 'react'
import type { Field } from '@pretzel-graph/shared/domain/Foundations/Field'
import { OptionsDropdown } from './OptionsDropdown'
import Tipped from '@/components/Tipped'

interface Props {
    node: Workflow.Node
}

export const NodeCustomToolbar: React.FC<Props> = memo(({ node }) => {
    const hasWorkflowDependency = !!node.workflowDependencyId
    const dependencyUpdate = WorkbenchSDK.useStore(s =>
        node.workflowDependencyId
            ? s.selectors.dependency.getUpdateInfo(s, node.workflowDependencyId)
            : null
    )

    return (
        <div className='bg-card border border-border rounded-lg p-0.5 gap-1 flex flex-row shadow-md shadow-black/10'>
            <Tipped label={node.isMinimized ? "Expand" : "Collapse"}>
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
            </Tipped>
            <Tipped label="Flip">
                <Button variant="ghost" size="icon-xs" className='h-6!'
                    onClick={() => {
                        WorkbenchSDK.actions.node.setFlipped(node.id, !node.isFlipped)
                    }}
                >
                    <SystemIcons.ArrowLeftRight />
                </Button>
            </Tipped>
            {hasWorkflowDependency && (
                <Tipped label="Open workflow">
                    <Button variant="ghost-active" size="icon-xs" className='h-6!'
                        onClick={() => WorkbenchSDK.openWorkflowWindow(node.workflowDependencyId!)}
                    >
                        <SystemIcons.Graph/>
                    </Button>
                </Tipped>
            )}
            {dependencyUpdate && (
                <Tipped label="Update workflow">
                    <Button variant="ghost-active" size="icon-xs" className='h-6!'
                        onClick={() => WorkbenchSDK.actions.dependency.update(dependencyUpdate)}
                    >
                        <SystemIcons.ArrowBigUpDash />
                    </Button>
                </Tipped>
            )}
            <Tipped label="Run">
                <Button variant="ghost-success" size="icon-xs" className='text-xs'>
                    <SystemIcons.Play />
                </Button>
            </Tipped>
            {node.toolCompatible && (
                <ToolButton node={node} />
            )}
            <OptionsDropdown node={node} />
        </div>
    )
})


const ToolButton: React.FC<Props> = memo(({ node }) => {
    const isTool = WorkbenchSDK.useStore(s => s.selectors.node.isTool(s, node.id));

    return (
        <Tipped label={isTool ? "Revert to node" : "Convert to tool"}>
            <Button variant="ghost" size="icon-xs" className={`h-6! ${isTool ? 'bg-(--port-Tool)/20 text-(--port-Tool) ' : ''}`}
                onClick={() => {
                    if (isTool) WorkbenchSDK.actions.tool.revert(node.id);
                    else WorkbenchSDK.actions.tool.convert(node.id);
                }}
            >
                <SystemIcons.Hammer />
            </Button>
        </Tipped>
    );
});
