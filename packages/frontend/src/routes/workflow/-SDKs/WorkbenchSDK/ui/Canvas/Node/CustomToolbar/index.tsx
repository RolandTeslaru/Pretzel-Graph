import { WorkbenchSDK } from '@/routes/workflow/-SDKs/WorkbenchSDK/sdk'
import { Button, Spinner } from '@pretzel-graph/standard-ui/foundations'
import { SystemIcons } from '@pretzel-graph/standard-ui/icons'
import type { Workflow } from '@pretzel-graph/shared/domain'
import React, { memo } from 'react'
import type { Field } from '@pretzel-graph/shared/domain/Foundations/Field'
import { OptionsDropdown } from './OptionsDropdown'
import Tipped from '@/components/Tipped'
import type { Blueprint } from '@pretzel-graph/shared/domain/Foundations/Blueprint'

interface Props {
    node: Workflow.Node
    blueprint: Blueprint
}

export const NodeCustomToolbar: React.FC<Props> = memo(({ node, blueprint }) => {
    const dep = node.dependency
    const hasWorkflowDependency = !!dep

    const [dependencyUpdate, mode] = WorkbenchSDK.useStore(s => s.selectors.node.getDependencyUpdate(s, node.id) ?? [null, null])

    const showExtrasPanel = dependencyUpdate || hasWorkflowDependency || blueprint.toolCompatible

    const handleDependencyUpdate = () => {
        if(mode === "draft")
            WorkbenchSDK.actions.dependency.draft.update(dependencyUpdate as Workflow.Dependency.Draft.UpdateInfo)
        else if(mode === "publication")
            WorkbenchSDK.actions.dependency.published.update(dependencyUpdate as Workflow.Dependency.Publication.UpdateInfo)
    }

    return (
        <div className='flex flex-row gap-1'>
            <div className='bg-card border border-border rounded-full p-0.5 gap-1 flex flex-row shadow-md shadow-black/10'>
                <Tipped label={node.ui?.isMinimized ? "Expand" : "Collapse"}>
                    <Button variant="ghost" size="icon-xs" className='h-6!'
                        onClick={() => {
                            WorkbenchSDK.actions.node.setMinimized(node.id, !node.ui?.isMinimized)
                        }}
                    >
                        {node.ui?.isMinimized ?
                            <SystemIcons.Maximize2 />
                            :
                            <SystemIcons.Minimize2 />
                        }
                    </Button>
                </Tipped>
                <Tipped label="Flip">
                    <Button variant="ghost" size="icon-xs" className='h-6!'
                        onClick={() => {
                            WorkbenchSDK.actions.node.setFlipped(node.id, !node.ui?.isFlipped)
                        }}
                    >
                        <SystemIcons.ArrowLeftRight />
                    </Button>
                </Tipped>
                
                <Tipped label="Run">
                    <Button variant="ghost-success" size="icon-xs" className='text-xs'>
                        <SystemIcons.Play />
                    </Button>
                </Tipped>
                <OptionsDropdown node={node} blueprint={blueprint} />
            </div>
            {showExtrasPanel && (
                <div className='bg-card flex flex-row gap-1 border-border border rounded-full h-[30px] p-0.5 shadow-md shadow-black/10'>
                    {blueprint.toolCompatible && (
                        <ToolButton node={node} blueprint={blueprint} />
                    )}
                    {hasWorkflowDependency && (
                        <Tipped label="Open workflow">
                            <Button variant="ghost-primary" size="icon-xs" className='h-6!'
                                onClick={() => WorkbenchSDK.openWorkflowWindow(dep!.workflowId!)}
                            >
                                <SystemIcons.Graph />
                            </Button>
                        </Tipped>
                    )}
                    {dependencyUpdate && 
                        <Tipped label={`Update ${mode} workflow`}>
                            <Button variant="ghost-active" size="icon-xs" className='h-6!'
                                onClick={handleDependencyUpdate}
                            >
                                <SystemIcons.ArrowBigUpDash />
                            </Button>
                        </Tipped>
                    }
                </div>
            )}
        </div>
    )
})


const ToolButton = memo(({ node }: { node: Workflow.Node }) => {
    const [isTool, isReconciling] = WorkbenchSDK.useStore(s => [
        s.selectors.node.isTool(s, node.id),
        s.selectors.field.isReconciling(s, node.id, "isConvertedToTool" as Field.Id)
    ]);

    return (
        <Tipped label={isTool ? "Revert to node" : "Convert to tool"}>
            <Button variant="ghost" size="icon-xs" className={`h-6! ${isTool ? 'bg-(--port-Tool)/20 ' : ''} text-(--port-Tool) `}
                onClick={() => {
                    if (isTool) WorkbenchSDK.actions.tool.revert(node.id);
                    else WorkbenchSDK.actions.tool.convert(node.id);
                }}
                disabled={isReconciling}
            >
                {isReconciling ? <Spinner /> : <SystemIcons.Hammer />}
            </Button>
        </Tipped>
    );
});
