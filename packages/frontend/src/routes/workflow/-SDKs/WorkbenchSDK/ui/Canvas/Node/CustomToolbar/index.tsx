import { WorkbenchSDK } from '@/routes/workflow/-SDKs/WorkbenchSDK/sdk'
import { Button, Spinner } from '@pretzel-graph/standard-ui/foundations'
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
    const dep = node.dependency
    const hasWorkflowDependency = !!dep
    const dependencyUpdate = WorkbenchSDK.useStore(s =>
        dep?.mode === "publication" && dep.workflowId
            ? s.selectors.dependency.published.getUpdateInfo(s, dep.workflowId)
            : null
    )
    const draftDependencyUpdate = WorkbenchSDK.useStore(s =>
        dep?.mode === "draft" && dep.workflowId
            ? s.selectors.dependency.draft.getUpdateInfo(s, dep.workflowId)
            : null
    )

    return (
        <div className='flex flex-row gap-1'>
            <div className='bg-card border border-border rounded-full p-0.5 gap-1 flex flex-row shadow-md shadow-black/10'>
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
                            onClick={() => WorkbenchSDK.openWorkflowWindow(dep!.workflowId!)}
                        >
                            <SystemIcons.Graph/>
                        </Button>
                    </Tipped>
                )}
                {dependencyUpdate && (
                    <Tipped label="Update workflow">
                        <Button variant="ghost-active" size="icon-xs" className='h-6!'
                            onClick={() => WorkbenchSDK.actions.dependency.published.update(dependencyUpdate)}
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
                {draftDependencyUpdate && (
            <div className='bg-card border-border border rounded-full h-[30px] p-0.5 shadow-md shadow-black/10'>
                    <Tipped label="Update draft workflow">
                        <Button variant="ghost-active" size="icon-xs" className='h-6!'
                            onClick={() => WorkbenchSDK.actions.dependency.draft.update(draftDependencyUpdate)}
                        >
                            <SystemIcons.ArrowBigUpDash />
                        </Button>
                    </Tipped>
            </div>
                )}
        </div>
    )
})


const ToolButton: React.FC<Props> = memo(({ node }) => {
    const [isTool, isReconciling] = WorkbenchSDK.useStore(s => [
        s.selectors.node.isTool(s, node.id),
        s.selectors.field.isReconciling(s, node.id, "isConvertedToTool" as Field.Id)
    ]);

    return (
        <Tipped label={isTool ? "Revert to node" : "Convert to tool"}>
            <Button variant="ghost" size="icon-xs" className={`h-6! ${isTool ? 'bg-(--port-Tool)/20 text-(--port-Tool) ' : ''}`}
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
