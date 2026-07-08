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
    hyNode: Workflow.Node.Hydrated
}

export const NodeCustomToolbar: React.FC<Props> = memo(({ hyNode }) => {
    const depRef = hyNode.dependencyRef
    const hasWorkflowDependency = !!depRef

    const [dependencyUpdate, mode] = WorkbenchSDK.useStore(s => s.selectors.node.getDependencyUpdate(s, hyNode.id) ?? [null, null])

    const showExtrasPanel = dependencyUpdate || hasWorkflowDependency || hyNode.blueprint.toolCompatible

    const handleDependencyUpdate = () => {
        if(mode === "draft")
            WorkbenchSDK.actions.dependency.draft.update(dependencyUpdate as Workflow.Dependency.Draft.UpdateInfo)
        else if(mode === "publication")
            WorkbenchSDK.actions.dependency.published.update(dependencyUpdate as Workflow.Dependency.Publication.UpdateInfo)
    }

    return (
        <div className='flex flex-row gap-1'>
            <div className='bg-card border border-border rounded-full p-0.5 gap-1 flex flex-row shadow-md shadow-black/10'>
                <Tipped label={hyNode.ui?.isMinimized ? "Expand" : "Collapse"}>
                    <Button variant="ghost" size="icon-xs" className='h-6!'
                        onClick={() => {
                            WorkbenchSDK.actions.node.setMinimized(hyNode.id, !hyNode.ui?.isMinimized)
                        }}
                    >
                        {hyNode.ui?.isMinimized ?
                            <SystemIcons.Maximize2 />
                            :
                            <SystemIcons.Minimize2 />
                        }
                    </Button>
                </Tipped>
                <Tipped label="Flip">
                    <Button variant="ghost" size="icon-xs" className='h-6!'
                        onClick={() => {
                            WorkbenchSDK.actions.node.setFlipped(hyNode.id, !hyNode.ui?.isFlipped)
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
                <OptionsDropdown node={hyNode}/>
            </div>
            {showExtrasPanel && (
                <div className='bg-card flex flex-row gap-1 border-border border rounded-full h-[30px] p-0.5 shadow-md shadow-black/10'>
                    {hyNode.blueprint.toolCompatible && (
                        <ToolButton nodeId={hyNode.id} />
                    )}
                    {hasWorkflowDependency && (
                        <Tipped label="Open workflow">
                            <Button variant="ghost-primary" size="icon-xs" className='h-6!'
                                onClick={() => WorkbenchSDK.openWorkflowWindow(depRef!.workflowId!)}
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


const ToolButton = memo(({ nodeId }: { nodeId: Workflow.Node.Id }) => {
    const [isTool, isReconciling] = WorkbenchSDK.useStore(s => [
        s.selectors.node.isTool(s, nodeId),
        s.selectors.field.isReconciling(s, nodeId, "isConvertedToTool" as Field.Id)
    ]);

    return (
        <Tipped label={isTool ? "Revert to node" : "Convert to tool"}>
            <Button variant="ghost" size="icon-xs" className={`h-6! ${isTool ? 'bg-(--port-Tool)/20 ' : ''} text-(--port-Tool) `}
                onClick={() => {
                    if (isTool) 
                        WorkbenchSDK.actions.tool.revert(nodeId);
                    else 
                        WorkbenchSDK.actions.tool.convert(nodeId);
                }}
                disabled={isReconciling}
            >
                {isReconciling ? <Spinner /> : <SystemIcons.Hammer />}
            </Button>
        </Tipped>
    );
});
